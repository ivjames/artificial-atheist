import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { loadClaimDrafts } from "@/lib/prophecy/draftload";

// AI claim-draft loader tests. Two blocks, same layout as
// prophecy-domain.test.ts:
// - pure validation tests (file-level refusals never touch the DB — a null
//   Prisma client proves it by exploding if anything tries);
// - DB integration gated on DATABASE_URL (dev DB with the five source lists
//   + entries already imported). Fixtures use the "t-draft-" slug prefix and
//   are swept by prefix in afterAll (pre-cleaned in beforeAll too, so a
//   crashed run leaves debuggable rows that the next run removes).

// A prisma stand-in that must never be touched: file-level validation
// failures return before any DB call.
const NO_DB = null as unknown as PrismaClient;

const META = {
  model: "test-model",
  promptVersion: "v1-test",
  generatedAt: "2026-07-26T00:00:00Z",
  method: "test-fixture",
};

describe("loadClaimDrafts validation (pure)", () => {
  it("refuses unparseable JSON with a single error", async () => {
    const res = await loadClaimDrafts(NO_DB, "not json {");
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/invalid JSON/);
    expect(res.claimsCreated + res.claimsSkipped + res.mappingsCreated + res.mappingsSkipped).toBe(0);
  });

  it("refuses non-object top level", async () => {
    const res = await loadClaimDrafts(NO_DB, JSON.stringify([1, 2, 3]));
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/top-level object/);
  });

  it("refuses a file with no meta (provenance mandatory)", async () => {
    const res = await loadClaimDrafts(NO_DB, JSON.stringify({ claims: [] }));
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/provenance is mandatory/);
  });

  it.each(["model", "promptVersion", "generatedAt"])(
    "refuses the whole file when meta.%s is missing",
    async (field) => {
      const meta: Record<string, string> = { ...META };
      delete meta[field];
      const res = await loadClaimDrafts(NO_DB, JSON.stringify({ meta, claims: [] }));
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]).toMatch(/meta\.model, meta\.promptVersion, and meta\.generatedAt/);
      expect(res.claimsCreated).toBe(0);
    },
  );

  it("refuses blank-string provenance fields", async () => {
    const res = await loadClaimDrafts(
      NO_DB,
      JSON.stringify({ meta: { ...META, model: "   " }, claims: [] }),
    );
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/provenance is mandatory/);
  });

  it("refuses when claims is not an array", async () => {
    const res = await loadClaimDrafts(NO_DB, JSON.stringify({ meta: META, claims: "nope" }));
    expect(res.errors).toEqual(["invalid file: claims must be an array"]);
  });

  it("reports per-claim shape errors without touching the DB", async () => {
    const res = await loadClaimDrafts(
      NO_DB,
      JSON.stringify({
        meta: META,
        claims: [
          "not an object",
          { slug: "x" }, // missing text
          { text: "no slug" },
          { slug: "y", text: "ok text", categoryKeys: "not-an-array" },
          { slug: "z", text: "ok text", mappings: "not-an-array" },
        ],
      }),
    );
    expect(res.claimsCreated).toBe(0);
    expect(res.errors).toHaveLength(5);
    expect(res.errors[0]).toMatch(/not an object/);
    expect(res.errors[1]).toMatch(/slug and text are required/);
    expect(res.errors[2]).toMatch(/slug and text are required/);
    expect(res.errors[3]).toMatch(/categoryKeys\/subjectKeys must be string arrays/);
    expect(res.errors[4]).toMatch(/mappings must be an array/);
  });

  it("a valid empty claims array loads nothing with no errors", async () => {
    const res = await loadClaimDrafts(NO_DB, JSON.stringify({ meta: META, claims: [] }));
    expect(res).toEqual({
      claimsCreated: 0,
      claimsSkipped: 0,
      mappingsCreated: 0,
      mappingsSkipped: 0,
      errors: [],
    });
  });
});

// ---------------------------------------------------------------------------
// DB integration (requires DATABASE_URL; source lists + entries imported)
// ---------------------------------------------------------------------------

const PREFIX = "t-draft-";

describe.skipIf(!process.env.DATABASE_URL)("loadClaimDrafts (DB)", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // Sweep by slug prefix: maps first (also restoring the real entries'
  // mappingStatus — the loader flips shared fixture entries to "mapped"),
  // then revisions targeting the claims, then the claims themselves.
  async function cleanup() {
    const claims = await prisma.prophecyClaim.findMany({
      where: { slug: { startsWith: PREFIX } },
      select: { id: true },
    });
    const claimIds = claims.map((c) => c.id);
    if (!claimIds.length) return;

    const maps = await prisma.prophecyClaimEntryMap.findMany({
      where: { claimId: { in: claimIds } },
      select: { entryId: true },
    });
    const entryIds = [...new Set(maps.map((m) => m.entryId))];
    await prisma.prophecyClaimEntryMap.deleteMany({ where: { claimId: { in: claimIds } } });
    // Entries with no remaining maps go back to "unmapped" so the shared dev
    // DB's mapping stats aren't polluted by this suite.
    for (const entryId of entryIds) {
      const remaining = await prisma.prophecyClaimEntryMap.count({ where: { entryId } });
      if (remaining === 0) {
        await prisma.prophecySourceListEntry.update({
          where: { id: entryId },
          data: { mappingStatus: "unmapped" },
        });
      }
    }
    await prisma.prophecyRevision.deleteMany({ where: { targetId: { in: claimIds } } });
    await prisma.prophecyClaim.deleteMany({ where: { id: { in: claimIds } } });
  }

  // Two real (listSlug, entryNumber) pairs, looked up at runtime from the
  // already-imported corpus (first entry of the first two lists by slug).
  let listA = "";
  let entryA = "";
  let listB = "";
  let entryB = "";

  beforeAll(async () => {
    await cleanup(); // pre-clean leftovers from a crashed run

    const lists = await prisma.prophecySourceList.findMany({
      where: { entries: { some: {} }, slug: { not: { startsWith: "t-" } } },
      orderBy: { slug: "asc" },
      take: 2,
      select: { slug: true, entries: { take: 1, orderBy: { entryNumber: "asc" }, select: { entryNumber: true } } },
    });
    expect(lists.length).toBe(2);
    listA = lists[0].slug;
    entryA = lists[0].entries[0].entryNumber;
    listB = lists[1].slug;
    entryB = lists[1].entries[0].entryNumber;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // 2 claims / 4 mappings against real entries. Slugs deliberately differ
  // from claimSlug(text) so the file's slug being authoritative is exercised.
  const fixture = () =>
    JSON.stringify({
      meta: META,
      claims: [
        {
          slug: `${PREFIX}alpha`,
          text: "A test ruler will arise from a named town (draft-loader fixture alpha)",
          summary: "Fixture alpha",
          categoryKeys: ["messianic_prophecy"],
          subjectKeys: ["city"],
          mappings: [
            { listSlug: listA, entryNumber: entryA, matchType: "exact", confidence: 5, rationale: "same wording" },
            { listSlug: listB, entryNumber: entryB, matchType: "partial", confidence: 3, rationale: "overlaps" },
          ],
        },
        {
          slug: `${PREFIX}beta`,
          text: "A test temple will fall within a generation (draft-loader fixture beta)",
          summary: "Fixture beta",
          categoryKeys: ["predictive_prophecy"],
          subjectKeys: ["temple"],
          mappings: [
            { listSlug: listA, entryNumber: entryA, matchType: "compound", confidence: 4, rationale: "one clause of a compound entry" },
            { listSlug: listB, entryNumber: entryB, matchType: "near_duplicate", confidence: 2, rationale: "looser restatement" },
          ],
        },
      ],
    });

  it("first run creates draft claims with provenance and mappings", async () => {
    const res = await loadClaimDrafts(prisma, fixture());
    expect(res.errors).toEqual([]);
    expect(res).toMatchObject({
      claimsCreated: 2,
      claimsSkipped: 0,
      mappingsCreated: 4,
      mappingsSkipped: 0,
    });

    const alpha = await prisma.prophecyClaim.findUnique({ where: { slug: `${PREFIX}alpha` } });
    expect(alpha).not.toBeNull();
    expect(alpha!.status).toBe("draft");
    expect(alpha!.createdBy).toBe("ai:test-model");
    expect(JSON.parse(alpha!.categoryKeys)).toEqual(["messianic_prophecy"]);

    // Provenance stamped on the creation revision.
    const revs = await prisma.prophecyRevision.findMany({
      where: { targetType: "claim", targetId: alpha!.id },
    });
    expect(revs).toHaveLength(1);
    expect(revs[0].note).toBe(
      "AI draft — model=test-model promptVersion=v1-test generatedAt=2026-07-26T00:00:00Z",
    );

    // Mappings carry the [ai-draft] rationale prefix.
    const maps = await prisma.prophecyClaimEntryMap.findMany({ where: { claimId: alpha!.id } });
    expect(maps).toHaveLength(2);
    for (const m of maps) expect(m.rationale.startsWith("[ai-draft] ")).toBe(true);
    expect(maps.map((m) => m.matchType).sort()).toEqual(["exact", "partial"]);
  });

  it("second run is a no-op: everything skipped, nothing duplicated", async () => {
    const res = await loadClaimDrafts(prisma, fixture());
    expect(res).toEqual({
      claimsCreated: 0,
      claimsSkipped: 2,
      mappingsCreated: 0,
      mappingsSkipped: 4,
      errors: [],
    });
    expect(await prisma.prophecyClaim.count({ where: { slug: { startsWith: PREFIX } } })).toBe(2);
    const alpha = await prisma.prophecyClaim.findUniqueOrThrow({
      where: { slug: `${PREFIX}alpha` },
    });
    expect(await prisma.prophecyClaimEntryMap.count({ where: { claimId: alpha.id } })).toBe(2);
    // No extra revisions from the re-run.
    expect(
      await prisma.prophecyRevision.count({ where: { targetType: "claim", targetId: alpha.id } }),
    ).toBe(1);
  });

  it("never overwrites a human-edited claim, but still fills missing mappings", async () => {
    const alpha = await prisma.prophecyClaim.findUniqueOrThrow({
      where: { slug: `${PREFIX}alpha` },
    });
    await prisma.prophecyClaim.update({
      where: { id: alpha.id },
      data: { text: "HUMAN EDITED — must survive the re-run" },
    });
    // Drop one of alpha's two mappings so the re-run has a gap to fill.
    const dropped = await prisma.prophecyClaimEntryMap.findFirst({
      where: { claimId: alpha.id },
    });
    await prisma.prophecyClaimEntryMap.delete({ where: { id: dropped!.id } });

    const res = await loadClaimDrafts(prisma, fixture());
    expect(res.errors).toEqual([]);
    expect(res.claimsCreated).toBe(0);
    expect(res.claimsSkipped).toBe(2);
    expect(res.mappingsCreated).toBe(1); // the dropped one came back
    expect(res.mappingsSkipped).toBe(3);

    const fresh = await prisma.prophecyClaim.findUniqueOrThrow({ where: { id: alpha.id } });
    expect(fresh.text).toBe("HUMAN EDITED — must survive the re-run");
    expect(await prisma.prophecyClaimEntryMap.count({ where: { claimId: alpha.id } })).toBe(2);
  });

  it("unknown listSlug / entryNumber / matchType become per-item errors without aborting", async () => {
    const res = await loadClaimDrafts(
      prisma,
      JSON.stringify({
        meta: META,
        claims: [
          {
            slug: `${PREFIX}gamma`,
            text: "A test nation will be scattered and regathered (draft-loader fixture gamma)",
            summary: "",
            categoryKeys: [],
            subjectKeys: ["nation"],
            mappings: [
              { listSlug: "no-such-list", entryNumber: "1", matchType: "exact", confidence: 5, rationale: "x" },
              { listSlug: listA, entryNumber: "no-such-entry-999", matchType: "exact", confidence: 5, rationale: "x" },
              { listSlug: listA, entryNumber: entryA, matchType: "not-a-match-type", confidence: 5, rationale: "x" },
              { listSlug: listA, entryNumber: entryA, matchType: "duplicate", confidence: 1, rationale: "good one" },
            ],
          },
        ],
      }),
    );

    // The claim itself and the one good mapping still land.
    expect(res.claimsCreated).toBe(1);
    expect(res.mappingsCreated).toBe(1);
    expect(res.mappingsSkipped).toBe(0);
    expect(res.errors).toHaveLength(3);
    expect(res.errors[0]).toMatch(/unknown source list "no-such-list"/);
    expect(res.errors[1]).toMatch(/no entry "no-such-entry-999"/);
    expect(res.errors[2]).toMatch(/invalid matchType/);

    const gamma = await prisma.prophecyClaim.findUniqueOrThrow({
      where: { slug: `${PREFIX}gamma` },
    });
    expect(await prisma.prophecyClaimEntryMap.count({ where: { claimId: gamma.id } })).toBe(1);
  });
});

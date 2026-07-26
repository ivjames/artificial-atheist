import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { csvEscape, parseImportFile, runImport } from "@/lib/prophecy/import";
import {
  claimSlug,
  createClaim,
  mapEntryToClaim,
  mergeClaims,
  searchClaims,
  updateClaimStatus,
} from "@/lib/prophecy/claims";
import { exportClaimsCSV, exportClaimsJSON } from "@/lib/prophecy/export";

// Phase 2 data-layer tests. Two blocks:
// - pure parsing/slug/escape tests that always run;
// - DB integration tests that run only when DATABASE_URL is set (dev DB on
//   the droplet / CI service container). Fixtures use the distinctive
//   "t-test-" slug prefix and are swept by prefix in afterAll, so a crashed
//   run leaves debuggable rows that the next run's pre-clean removes.

// ---------------------------------------------------------------------------
// Pure: parseImportFile
// ---------------------------------------------------------------------------

describe("parseImportFile", () => {
  it("parses a JSON array with canonical keys", () => {
    const text = JSON.stringify([
      { entryNumber: "1", originalWording: "A ruler from Bethlehem", originalPassageRefs: "Micah 5:2" },
      { entryNumber: "2", originalWording: "Born of a virgin", notes: "disputed translation" },
    ]);
    const { rows, errors } = parseImportFile(text, "json");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      entryNumber: "1",
      originalWording: "A ruler from Bethlehem",
      originalPassageRefs: "Micah 5:2",
    });
    expect(rows[1].notes).toBe("disputed translation");
    // raw preserves the original object verbatim
    expect(JSON.parse(rows[0].raw)).toMatchObject({ entryNumber: "1" });
  });

  it("accepts JSON key aliases and coerces numeric entry numbers", () => {
    const text = JSON.stringify([
      { entry: 7, text: "Pierced hands", passageRefs: "Psalm 22:16", fulfillmentRefs: "John 20:25" },
      { n: "8a", claim: "Thirty pieces of silver" },
    ]);
    const { rows, errors } = parseImportFile(text, "json");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      entryNumber: "7",
      originalWording: "Pierced hands",
      originalPassageRefs: "Psalm 22:16",
      originalFulfillmentRefs: "John 20:25",
    });
    expect(rows[1]).toMatchObject({ entryNumber: "8a", originalWording: "Thirty pieces of silver" });
  });

  it("parses a CSV happy path with a header row", () => {
    const text = "entryNumber,originalWording,originalPassageRefs\n1,Foretold exile,Jeremiah 25:11\n2,Return from exile,Ezra 1:1\n";
    const { rows, errors } = parseImportFile(text, "csv");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ entryNumber: "2", originalWording: "Return from exile" });
    // CSV raw is a header→value object
    expect(JSON.parse(rows[0].raw)).toEqual({
      entryNumber: "1",
      originalWording: "Foretold exile",
      originalPassageRefs: "Jeremiah 25:11",
    });
  });

  it("handles quoted CSV fields with embedded commas, quotes, and newlines", () => {
    const text =
      'number,wording,notes\n' +
      '1,"A ruler, ancient of days","He said ""soon""\nacross two lines"\n';
    const { rows, errors } = parseImportFile(text, "csv");
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].originalWording).toBe("A ruler, ancient of days");
    expect(rows[0].notes).toBe('He said "soon"\nacross two lines');
  });

  it("resolves CSV header aliases case/space-insensitively", () => {
    const text = "Entry Number,Prophecy,Passage Refs,Fulfillment Refs,Note\n3,City destroyed,Ezekiel 26,Josephus,later rebuilt\n";
    const { rows, errors } = parseImportFile(text, "csv");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      entryNumber: "3",
      originalWording: "City destroyed",
      originalPassageRefs: "Ezekiel 26",
      originalFulfillmentRefs: "Josephus",
      notes: "later rebuilt",
    });
  });

  it("reports per-row errors for missing required fields but keeps good rows", () => {
    const text = JSON.stringify([
      { entryNumber: "1", originalWording: "ok" },
      { entryNumber: "2" }, // missing wording
      { originalWording: "no number" }, // missing entryNumber
    ]);
    const { rows, errors } = parseImportFile(text, "json");
    expect(rows).toHaveLength(1);
    expect(errors).toContain("row 2: missing originalWording");
    expect(errors).toContain("row 3: missing entryNumber");
  });

  it("fails at the header level when a CSV column cannot be resolved", () => {
    const { rows, errors } = parseImportFile("foo,bar\n1,2\n", "csv");
    expect(rows).toEqual([]);
    expect(errors.some((e) => e.includes("entryNumber"))).toBe(true);
    expect(errors.some((e) => e.includes("originalWording"))).toBe(true);
  });

  it("returns a single error for invalid JSON", () => {
    const { rows, errors } = parseImportFile("not json", "json");
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/invalid JSON/);
  });
});

// ---------------------------------------------------------------------------
// Pure: claimSlug + csvEscape
// ---------------------------------------------------------------------------

describe("claimSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(claimSlug("A Ruler from Bethlehem")).toBe("a-ruler-from-bethlehem");
  });

  it("collapses runs of non-alphanumerics and trims edge hyphens", () => {
    expect(claimSlug("  --Weird!!  punctuation??--  ")).toBe("weird-punctuation");
  });

  it("caps at ~80 chars without a trailing hyphen", () => {
    const slug = claimSlug("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns empty string for text with no alphanumerics", () => {
    expect(claimSlug("!!! ???")).toBe("");
    expect(claimSlug("")).toBe("");
  });
});

describe("csvEscape", () => {
  it("round-trips values with commas, quotes, and newlines through the parser", () => {
    const nasty = 'He said "no, never"\nsecond line';
    const csv = `entryNumber,wording\n1,${csvEscape(nasty)}\n`;
    const { rows, errors } = parseImportFile(csv, "csv");
    expect(errors).toEqual([]);
    expect(rows[0].originalWording).toBe(nasty);
  });

  it("leaves plain values unquoted", () => {
    expect(csvEscape("plain value")).toBe("plain value");
    expect(csvEscape('has "quotes"')).toBe('"has ""quotes"""');
  });
});

// ---------------------------------------------------------------------------
// DB integration (requires DATABASE_URL; migrations + seed already applied)
// ---------------------------------------------------------------------------

const PREFIX = "t-test-";

describe.skipIf(!process.env.DATABASE_URL)("prophecy data layer (DB)", async () => {
  // Dynamic import so the pure block never touches Prisma when skipped.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // Sweep everything this suite creates, keyed off the slug prefix. Order
  // matters: claims first (cascades maps/links/interpretations/fulfillments),
  // then passages/documents/corpora/traditions, then source lists (cascades
  // batches/entries), then reviewers and the polymorphic leftovers.
  async function cleanup() {
    const claims = await prisma.prophecyClaim.findMany({
      where: { slug: { startsWith: PREFIX } },
      select: { id: true },
    });
    const claimIds = claims.map((c) => c.id);
    if (claimIds.length) {
      await prisma.prophecyRelationship.deleteMany({
        where: { OR: [{ fromId: { in: claimIds } }, { toId: { in: claimIds } }] },
      });
      await prisma.prophecyRevision.deleteMany({ where: { targetId: { in: claimIds } } });
      await prisma.prophecyEvaluation.deleteMany({ where: { targetId: { in: claimIds } } });
      // supersededById self-relation defaults to SetNull, so one deleteMany
      // is safe even when both ends of a merge are in the batch.
      await prisma.prophecyClaim.deleteMany({ where: { id: { in: claimIds } } });
    }
    await prisma.prophecyPassage.deleteMany({
      where: { document: { slug: { startsWith: PREFIX } } },
    });
    await prisma.prophecyDocument.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    await prisma.prophecyCorpus.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    await prisma.prophecyTradition.deleteMany({ where: { key: { startsWith: PREFIX } } });
    await prisma.prophecySourceList.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    await prisma.prophecyReviewer.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  // Fixture chain: tradition → corpus → document → passage, plus a source
  // list. Built once; individual tests create their own claims/entries.
  let sourceListId = "";
  let passageId = "";

  beforeAll(async () => {
    await cleanup(); // pre-clean leftovers from a crashed run

    const tradition = await prisma.prophecyTradition.create({
      data: { key: `${PREFIX}tradition`, name: "Test tradition" },
    });
    const corpus = await prisma.prophecyCorpus.create({
      data: { slug: `${PREFIX}corpus`, name: "Test corpus", traditionId: tradition.id },
    });
    const document = await prisma.prophecyDocument.create({
      data: { slug: `${PREFIX}micah`, name: "Test Micah", corpusId: corpus.id },
    });
    const passage = await prisma.prophecyPassage.create({
      data: { documentId: document.id, ref: "Test Micah 5:2" },
    });
    passageId = passage.id;
    const sourceList = await prisma.prophecySourceList.create({
      data: { slug: `${PREFIX}list`, title: "Test 324 list", claimedCount: 3 },
    });
    sourceListId = sourceList.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const importJson = JSON.stringify([
    { entryNumber: "1", originalWording: "A ruler will come from t-test-bethlehem", originalPassageRefs: "Micah 5:2" },
    { entryNumber: "2", originalWording: "The t-test-temple will fall" },
    { entryNumber: "3", originalWording: "Exile will last seventy t-test-years" },
  ]);

  it("runImport is idempotent: created N, then skipped N, entry count stable", async () => {
    const first = await runImport(prisma, {
      sourceListId,
      format: "json",
      filename: "fixture.json",
      text: importJson,
      importedBy: "vitest",
    });
    expect(first.created).toBe(3);
    expect(first.skipped).toBe(0);
    expect(first.errors).toEqual([]);

    const second = await runImport(prisma, {
      sourceListId,
      format: "json",
      text: importJson,
    });
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(3);

    const count = await prisma.prophecySourceListEntry.count({ where: { sourceListId } });
    expect(count).toBe(3);

    // First entry is untouched by the re-import (no overwrite).
    const entry = await prisma.prophecySourceListEntry.findUnique({
      where: { sourceListId_entryNumber: { sourceListId, entryNumber: "1" } },
    });
    expect(entry?.originalPassageRefs).toBe("Micah 5:2");

    const batch = await prisma.prophecyImportBatch.findUnique({ where: { id: first.batchId } });
    expect(batch?.status).toBe("parsed");
  });

  it("createClaim resolves slug collisions with -2 suffixes and validates keys", async () => {
    const a = await createClaim(prisma, {
      text: "t-test-collision claim",
      categoryKeys: ["messianic_prophecy"],
      subjectKeys: ["city"],
    });
    const b = await createClaim(prisma, { text: "t-test-collision claim" });
    expect(a.slug).toBe("t-test-collision-claim");
    expect(b.slug).toBe("t-test-collision-claim-2");
    expect(JSON.parse(a.categoryKeys)).toEqual(["messianic_prophecy"]);

    await expect(createClaim(prisma, { text: "   " })).rejects.toThrow(/non-empty/);
    await expect(
      createClaim(prisma, { text: "t-test-bad-key", categoryKeys: ["not_a_category"] }),
    ).rejects.toThrow(/unknown category key/);

    // Creation writes a revision snapshot.
    const revs = await prisma.prophecyRevision.count({
      where: { targetType: "claim", targetId: a.id },
    });
    expect(revs).toBe(1);
  });

  it("updateClaimStatus validates the state and snapshots the prior record", async () => {
    const claim = await createClaim(prisma, { text: "t-test-status claim" });
    await expect(updateClaimStatus(prisma, claim.id, "bogus")).rejects.toThrow(/invalid status/);
    const updated = await updateClaimStatus(prisma, claim.id, "approved");
    expect(updated.status).toBe("approved");
    const revs = await prisma.prophecyRevision.findMany({
      where: { targetType: "claim", targetId: claim.id },
      orderBy: { createdAt: "asc" },
    });
    expect(revs.length).toBe(2); // create + status change
    expect(JSON.parse(revs[1].snapshot).status).toBe("draft"); // pre-edit state
  });

  it("mapEntryToClaim upserts and flips the entry's mappingStatus", async () => {
    const claim = await createClaim(prisma, { text: "t-test-mapping claim" });
    const entry = await prisma.prophecySourceListEntry.findUniqueOrThrow({
      where: { sourceListId_entryNumber: { sourceListId, entryNumber: "1" } },
    });

    await expect(
      mapEntryToClaim(prisma, { claimId: claim.id, entryId: entry.id, matchType: "wat", confidence: 3 }),
    ).rejects.toThrow(/invalid matchType/);
    await expect(
      mapEntryToClaim(prisma, { claimId: claim.id, entryId: entry.id, matchType: "exact", confidence: 9 }),
    ).rejects.toThrow(/0-5/);

    await mapEntryToClaim(prisma, {
      claimId: claim.id,
      entryId: entry.id,
      matchType: "partial",
      confidence: 3,
    });
    // Upsert: second call refines the same row instead of duplicating.
    await mapEntryToClaim(prisma, {
      claimId: claim.id,
      entryId: entry.id,
      matchType: "exact",
      confidence: 5,
      rationale: "verbatim match",
    });
    const maps = await prisma.prophecyClaimEntryMap.findMany({
      where: { claimId: claim.id, entryId: entry.id },
    });
    expect(maps).toHaveLength(1);
    expect(maps[0]).toMatchObject({ matchType: "exact", confidence: 5 });

    let fresh = await prisma.prophecySourceListEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(fresh.mappingStatus).toBe("mapped");

    // Disputed match flips the entry to disputed.
    await mapEntryToClaim(prisma, {
      claimId: claim.id,
      entryId: entry.id,
      matchType: "disputed",
      confidence: 1,
    });
    fresh = await prisma.prophecySourceListEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(fresh.mappingStatus).toBe("disputed");
  });

  it("mergeClaims moves mappings, marks superseded, preserves provenance", async () => {
    const canonical = await createClaim(prisma, { text: "t-test-merge canonical" });
    const duplicate = await createClaim(prisma, { text: "t-test-merge duplicate" });
    const entry2 = await prisma.prophecySourceListEntry.findUniqueOrThrow({
      where: { sourceListId_entryNumber: { sourceListId, entryNumber: "2" } },
    });
    const entry3 = await prisma.prophecySourceListEntry.findUniqueOrThrow({
      where: { sourceListId_entryNumber: { sourceListId, entryNumber: "3" } },
    });

    // entry2 mapped to BOTH (canonical wins keep-first); entry3 only to the
    // duplicate (must move). The duplicate also carries a passage link.
    await mapEntryToClaim(prisma, { claimId: canonical.id, entryId: entry2.id, matchType: "exact", confidence: 5 });
    await mapEntryToClaim(prisma, { claimId: duplicate.id, entryId: entry2.id, matchType: "duplicate", confidence: 4 });
    await mapEntryToClaim(prisma, { claimId: duplicate.id, entryId: entry3.id, matchType: "partial", confidence: 3 });
    await prisma.prophecyClaimPassage.create({
      data: { claimId: duplicate.id, passageId },
    });

    // Self-merge refused.
    await expect(
      mergeClaims(prisma, { duplicateId: canonical.id, canonicalId: canonical.id }),
    ).rejects.toThrow(/itself/);

    const survivor = await mergeClaims(prisma, {
      duplicateId: duplicate.id,
      canonicalId: canonical.id,
      note: "same proposition",
    });
    expect(survivor.id).toBe(canonical.id);

    // Provenance: both entries reachable from the canonical claim; the
    // duplicate holds none; the canonical's original judgment on entry2 won.
    const canonicalMaps = await prisma.prophecyClaimEntryMap.findMany({
      where: { claimId: canonical.id },
    });
    expect(new Set(canonicalMaps.map((m) => m.entryId))).toEqual(new Set([entry2.id, entry3.id]));
    expect(canonicalMaps.find((m) => m.entryId === entry2.id)?.matchType).toBe("exact");
    expect(
      await prisma.prophecyClaimEntryMap.count({ where: { claimId: duplicate.id } }),
    ).toBe(0);

    // Passage link moved.
    const passageLinks = await prisma.prophecyClaimPassage.findMany({
      where: { claimId: canonical.id },
    });
    expect(passageLinks.map((p) => p.passageId)).toEqual([passageId]);

    // Duplicate superseded, not deleted; relationship edge recorded.
    const dupFresh = await prisma.prophecyClaim.findUniqueOrThrow({ where: { id: duplicate.id } });
    expect(dupFresh.status).toBe("superseded");
    expect(dupFresh.supersededById).toBe(canonical.id);
    const edge = await prisma.prophecyRelationship.findFirst({
      where: { fromType: "claim", fromId: duplicate.id, toType: "claim", toId: canonical.id, type: "duplicate_of" },
    });
    expect(edge).not.toBeNull();

    // Revision snapshots for both sides of the merge.
    for (const id of [canonical.id, duplicate.id]) {
      const revs = await prisma.prophecyRevision.count({ where: { targetType: "claim", targetId: id } });
      expect(revs).toBeGreaterThanOrEqual(2); // create + merge
    }

    // Merging an already-superseded claim is refused.
    const third = await createClaim(prisma, { text: "t-test-merge third" });
    await expect(
      mergeClaims(prisma, { duplicateId: duplicate.id, canonicalId: third.id }),
    ).rejects.toThrow(/already superseded/);
  });

  it("searchClaims finds by fragment and respects filters", async () => {
    const claim = await createClaim(prisma, {
      text: "The t-test-zorblat oracle names a specific king",
      categoryKeys: ["oracle"],
    });
    await updateClaimStatus(prisma, claim.id, "approved");

    const byFragment = await searchClaims(prisma, { q: "t-test-zorblat" });
    expect(byFragment.map((c) => c.id)).toContain(claim.id);

    // Case-insensitive.
    const byUpper = await searchClaims(prisma, { q: "T-TEST-ZORBLAT" });
    expect(byUpper.map((c) => c.id)).toContain(claim.id);

    // Status filter excludes, then includes.
    const draftsOnly = await searchClaims(prisma, { q: "t-test-zorblat", status: "draft" });
    expect(draftsOnly.map((c) => c.id)).not.toContain(claim.id);
    const approved = await searchClaims(prisma, { q: "t-test-zorblat", status: "approved" });
    expect(approved.map((c) => c.id)).toContain(claim.id);

    // Category filter (coarse JSON contains, quoted key).
    const byCategory = await searchClaims(prisma, { q: "t-test-zorblat", categoryKey: "oracle" });
    expect(byCategory.map((c) => c.id)).toContain(claim.id);
    const wrongCategory = await searchClaims(prisma, { q: "t-test-zorblat", categoryKey: "vision" });
    expect(wrongCategory.map((c) => c.id)).not.toContain(claim.id);

    // sourceListId filter via the entry-map relation.
    const entry = await prisma.prophecySourceListEntry.findUniqueOrThrow({
      where: { sourceListId_entryNumber: { sourceListId, entryNumber: "1" } },
    });
    await mapEntryToClaim(prisma, { claimId: claim.id, entryId: entry.id, matchType: "partial", confidence: 2 });
    const byList = await searchClaims(prisma, { q: "t-test-zorblat", sourceListId });
    expect(byList.map((c) => c.id)).toContain(claim.id);
  });

  it("export functions include the seeded fixture", async () => {
    const json = await exportClaimsJSON(prisma);
    const parsed = JSON.parse(json) as Array<{ slug: string; entries: Array<{ sourceList: string; entryNumber: string }>; passages: Array<{ ref: string }> }>;
    const merged = parsed.find((c) => c.slug === "t-test-merge-canonical");
    expect(merged).toBeDefined();
    expect(merged!.entries.map((e) => `${e.sourceList}:${e.entryNumber}`).sort()).toEqual([
      "t-test-list:2",
      "t-test-list:3",
    ]);
    expect(merged!.passages.map((p) => p.ref)).toContain("Test Micah 5:2");

    const csv = await exportClaimsCSV(prisma);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "slug,text,status,categoryKeys,entryCount,entryNumbers,passageRefs,fulfillmentDirections",
    );
    const row = lines.find((l) => l.startsWith("t-test-merge-canonical,"));
    expect(row).toBeDefined();
    expect(row).toContain("t-test-list:2;t-test-list:3");
    expect(row).toContain("Test Micah 5:2");
  });
});

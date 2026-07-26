// Public prophecy read-model tests. The load-bearing assertion in this file is
// NEGATIVE: unpublished claim content must be unreachable from every public
// entry point. A regression here leaks unreviewed material onto the live site,
// so each public function gets its own draft-invisibility case.
//
// DB-gated like the other prophecy integration tests: skipped without
// DATABASE_URL, run against the local dev Postgres on the droplet/dev box.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getPublishedClaim,
  getSourceList,
  listPublishedClaims,
  listSourceLists,
  publicStats,
  resolveMergedClaimSlug,
} from "@/lib/prophecy/public";
import { mergeClaims } from "@/lib/prophecy/claims";

const hasDb = Boolean(process.env.DATABASE_URL);
const P = "t-pub-";

describe.skipIf(!hasDb)("prophecy public read model", () => {
  const prisma = new PrismaClient();
  let listId = "";
  let publishedId = "";
  let draftId = "";
  let entryPubId = "";
  let entryDraftId = "";

  async function sweep() {
    const claims = await prisma.prophecyClaim.findMany({
      where: { slug: { startsWith: P } },
      select: { id: true },
    });
    const ids = claims.map((c) => c.id);
    if (ids.length) {
      await prisma.prophecyClaimEntryMap.deleteMany({ where: { claimId: { in: ids } } });
      await prisma.prophecyRelationship.deleteMany({
        where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
      });
      await prisma.prophecyRevision.deleteMany({
        where: { targetType: "claim", targetId: { in: ids } },
      });
      await prisma.prophecyClaim.updateMany({
        where: { id: { in: ids } },
        data: { supersededById: null },
      });
      await prisma.prophecyClaim.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.prophecySourceListEntry.deleteMany({
      where: { sourceList: { slug: { startsWith: P } } },
    });
    await prisma.prophecySourceList.deleteMany({ where: { slug: { startsWith: P } } });
  }

  beforeAll(async () => {
    await sweep();

    const list = await prisma.prophecySourceList.create({
      data: {
        slug: `${P}list`,
        title: "T-Pub Fixture List",
        description: "Fixture list retrieved from https://example.invalid/fixture",
        claimedCount: 99,
      },
    });
    listId = list.id;

    const [ePub, eDraft] = await Promise.all([
      prisma.prophecySourceListEntry.create({
        data: {
          sourceListId: listId,
          entryNumber: "1",
          originalWording: "Fixture entry mapped to a published claim",
          originalPassageRefs: "Isa 1:1",
          originalFulfillmentRefs: "Mt 1:1",
          originalRaw: "{}",
        },
      }),
      prisma.prophecySourceListEntry.create({
        data: {
          sourceListId: listId,
          entryNumber: "2",
          originalWording: "Fixture entry mapped only to a draft claim",
          originalPassageRefs: "Isa 2:2",
          originalFulfillmentRefs: "Mt 2:2",
          originalRaw: "{}",
        },
      }),
    ]);
    entryPubId = ePub.id;
    entryDraftId = eDraft.id;

    const published = await prisma.prophecyClaim.create({
      data: {
        slug: `${P}published`,
        text: "A tpubfixture ruler would come from somewhere",
        summary: "Fixture published claim",
        status: "published",
        categoryKeys: JSON.stringify(["messianic_prophecy"]),
        subjectKeys: JSON.stringify(["person"]),
        createdBy: "ai:test-model",
      },
    });
    publishedId = published.id;

    const draft = await prisma.prophecyClaim.create({
      data: {
        slug: `${P}draft`,
        text: "A tpubfixture secret unreviewed proposition",
        summary: "Fixture draft claim",
        status: "draft",
        categoryKeys: JSON.stringify(["messianic_prophecy"]),
        subjectKeys: JSON.stringify(["person"]),
      },
    });
    draftId = draft.id;

    await prisma.prophecyClaimEntryMap.createMany({
      data: [
        {
          claimId: publishedId,
          entryId: entryPubId,
          matchType: "exact",
          confidence: 5,
          rationale: "fixture exact",
        },
        {
          claimId: draftId,
          entryId: entryDraftId,
          matchType: "exact",
          confidence: 4,
          rationale: "fixture draft-only",
        },
      ],
    });

    // Relationship from the published claim to the DRAFT claim — must not surface.
    await prisma.prophecyRelationship.create({
      data: {
        fromType: "claim",
        fromId: publishedId,
        toType: "claim",
        toId: draftId,
        type: "potential_duplicate_of",
        note: "fixture edge to unpublished counterpart",
      },
    });
  });

  afterAll(async () => {
    await sweep();
    await prisma.$disconnect();
  });

  it("lists only published claims", async () => {
    const { claims } = await listPublishedClaims(prisma, { q: "tpubfixture", take: 50 });
    const slugs = claims.map((c) => c.slug);
    expect(slugs).toContain(`${P}published`);
    expect(slugs).not.toContain(`${P}draft`);
    expect(claims.every((c) => c.status === "published")).toBe(true);
  });

  it("counts mapped entries on the index", async () => {
    const { claims } = await listPublishedClaims(prisma, { q: "tpubfixture", take: 50 });
    const row = claims.find((c) => c.slug === `${P}published`);
    expect(row?.entryCount).toBe(1);
  });

  it("filters by category and subject keys", async () => {
    const hit = await listPublishedClaims(prisma, {
      q: "tpubfixture",
      categoryKey: "messianic_prophecy",
    });
    expect(hit.claims.map((c) => c.slug)).toContain(`${P}published`);

    const miss = await listPublishedClaims(prisma, {
      q: "tpubfixture",
      categoryKey: "failed_prophecy",
    });
    expect(miss.claims.map((c) => c.slug)).not.toContain(`${P}published`);
  });

  it("returns null for an unpublished claim slug", async () => {
    expect(await getPublishedClaim(prisma, `${P}draft`)).toBeNull();
    expect(await getPublishedClaim(prisma, `${P}nonexistent`)).toBeNull();
  });

  it("returns the published claim with its verbatim entry provenance", async () => {
    const claim = await getPublishedClaim(prisma, `${P}published`);
    expect(claim).not.toBeNull();
    expect(claim!.entryMaps).toHaveLength(1);
    expect(claim!.entryMaps[0].entry.originalWording).toBe(
      "Fixture entry mapped to a published claim",
    );
    expect(claim!.entryMaps[0].matchType).toBe("exact");
    expect(claim!.entryMaps[0].entry.sourceList.slug).toBe(`${P}list`);
  });

  it("drops relationships whose counterpart is unpublished", async () => {
    const claim = await getPublishedClaim(prisma, `${P}published`);
    expect(claim!.relationships).toHaveLength(0);
  });

  it("exposes published claim links on a source list but not draft ones", async () => {
    const list = await getSourceList(prisma, `${P}list`);
    expect(list).not.toBeNull();
    const byNumber = new Map(list!.entries.map((e) => [e.entryNumber, e]));
    expect(byNumber.get("1")!.claims.map((c) => c.slug)).toEqual([`${P}published`]);
    // Entry 2 maps only to a draft claim, so publicly it looks unmapped.
    expect(byNumber.get("2")!.claims).toHaveLength(0);
    // ...but its verbatim wording is still public provenance.
    expect(byNumber.get("2")!.originalWording).toBe("Fixture entry mapped only to a draft claim");
  });

  it("counts only published claims as mapped on the list index", async () => {
    const summary = (await listSourceLists(prisma)).find((l) => l.slug === `${P}list`);
    expect(summary?.entryCount).toBe(2);
    expect(summary?.publishedMappedCount).toBe(1);
    expect(summary?.claimedCount).toBe(99);
  });

  it("reports published-only claim counts in the landing stats", async () => {
    const before = await publicStats(prisma);
    await prisma.prophecyClaim.update({
      where: { id: draftId },
      data: { status: "published" },
    });
    const after = await publicStats(prisma);
    expect(after.publishedClaims).toBe(before.publishedClaims + 1);
    await prisma.prophecyClaim.update({ where: { id: draftId }, data: { status: "draft" } });
  });

  it("sorts entries numerically, not lexically", async () => {
    await prisma.prophecySourceListEntry.create({
      data: {
        sourceListId: listId,
        entryNumber: "10",
        originalWording: "Tenth fixture entry",
        originalPassageRefs: "",
        originalFulfillmentRefs: "",
        originalRaw: "{}",
      },
    });
    const list = await getSourceList(prisma, `${P}list`);
    expect(list!.entries.map((e) => e.entryNumber)).toEqual(["1", "2", "10"]);
  });
});

// Regression tests for PR #46 review findings: a merged claim's public URL must
// resolve to its survivor rather than 404, and merges must carry the duplicate's
// relationship edges over to the canonical claim.
describe.skipIf(!hasDb)("merge follow-through", () => {
  const prisma = new PrismaClient();
  const M = "t-mrg-";

  async function sweep() {
    const ids = (
      await prisma.prophecyClaim.findMany({
        where: { slug: { startsWith: M } },
        select: { id: true },
      })
    ).map((c) => c.id);
    if (ids.length) {
      await prisma.prophecyClaimEntryMap.deleteMany({ where: { claimId: { in: ids } } });
      await prisma.prophecyRelationship.deleteMany({
        where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
      });
      await prisma.prophecyRevision.deleteMany({
        where: { targetType: "claim", targetId: { in: ids } },
      });
      await prisma.prophecyClaim.updateMany({
        where: { id: { in: ids } },
        data: { supersededById: null },
      });
      await prisma.prophecyClaim.deleteMany({ where: { id: { in: ids } } });
    }
  }

  async function mkClaim(suffix: string, status = "published") {
    return prisma.prophecyClaim.create({
      data: {
        slug: `${M}${suffix}`,
        text: `Merge fixture ${suffix}`,
        summary: "",
        status,
        categoryKeys: "[]",
        subjectKeys: "[]",
      },
    });
  }

  beforeAll(sweep);
  afterAll(async () => {
    await sweep();
    await prisma.$disconnect();
  });

  it("redirect target: a merged published slug resolves to its survivor", async () => {
    const canonical = await mkClaim("canonical");
    const duplicate = await mkClaim("duplicate");
    await mergeClaims(prisma, { duplicateId: duplicate.id, canonicalId: canonical.id });

    // The old URL no longer resolves as a published claim...
    expect(await getPublishedClaim(prisma, `${M}duplicate`)).toBeNull();
    // ...but resolves to the survivor rather than dead-ending in a 404.
    expect(await resolveMergedClaimSlug(prisma, `${M}duplicate`)).toBe(`${M}canonical`);
  });

  it("does not resolve a merge pointer into an unpublished survivor", async () => {
    const canonical = await mkClaim("draft-canonical", "draft");
    const duplicate = await mkClaim("orphan-duplicate");
    await mergeClaims(prisma, { duplicateId: duplicate.id, canonicalId: canonical.id });
    expect(await resolveMergedClaimSlug(prisma, `${M}orphan-duplicate`)).toBeNull();
  });

  it("follows a merge chain to the published survivor", async () => {
    const c = await mkClaim("chain-c");
    const b = await mkClaim("chain-b");
    const a = await mkClaim("chain-a");
    await mergeClaims(prisma, { duplicateId: a.id, canonicalId: b.id });
    await mergeClaims(prisma, { duplicateId: b.id, canonicalId: c.id });
    expect(await resolveMergedClaimSlug(prisma, `${M}chain-a`)).toBe(`${M}chain-c`);
  });

  it("returns null for unknown and for merely-unpublished slugs", async () => {
    await mkClaim("plain-draft", "draft");
    expect(await resolveMergedClaimSlug(prisma, `${M}plain-draft`)).toBeNull();
    expect(await resolveMergedClaimSlug(prisma, `${M}does-not-exist`)).toBeNull();
  });

  it("re-points the duplicate's relationship edges onto the canonical claim", async () => {
    const canonical = await mkClaim("rel-canonical");
    const duplicate = await mkClaim("rel-duplicate");
    const outside = await mkClaim("rel-outside");

    // duplicate --contradicts--> outside, and outside --depends_on--> duplicate
    await prisma.prophecyRelationship.create({
      data: {
        fromType: "claim",
        fromId: duplicate.id,
        toType: "claim",
        toId: outside.id,
        type: "contradicts",
        note: "outgoing",
      },
    });
    await prisma.prophecyRelationship.create({
      data: {
        fromType: "claim",
        fromId: outside.id,
        toType: "claim",
        toId: duplicate.id,
        type: "depends_on",
        note: "incoming",
      },
    });

    await mergeClaims(prisma, { duplicateId: duplicate.id, canonicalId: canonical.id });

    const outgoing = await prisma.prophecyRelationship.findFirst({
      where: { type: "contradicts", toId: outside.id },
    });
    expect(outgoing?.fromId).toBe(canonical.id);

    const incoming = await prisma.prophecyRelationship.findFirst({
      where: { type: "depends_on", fromId: outside.id },
    });
    expect(incoming?.toId).toBe(canonical.id);
  });

  it("drops edges that would become self-edges or collide on merge", async () => {
    const canonical = await mkClaim("col-canonical");
    const duplicate = await mkClaim("col-duplicate");
    const outside = await mkClaim("col-outside");

    // Would become canonical --shares_passage_with--> canonical (self-edge).
    await prisma.prophecyRelationship.create({
      data: {
        fromType: "claim",
        fromId: duplicate.id,
        toType: "claim",
        toId: canonical.id,
        type: "shares_passage_with",
        note: "self after merge",
      },
    });
    // Both already point at outside with the same type → collision.
    for (const from of [canonical.id, duplicate.id]) {
      await prisma.prophecyRelationship.create({
        data: {
          fromType: "claim",
          fromId: from,
          toType: "claim",
          toId: outside.id,
          type: "supports",
          note: from === canonical.id ? "canonical keeps this" : "duplicate's collides",
        },
      });
    }

    await mergeClaims(prisma, { duplicateId: duplicate.id, canonicalId: canonical.id });

    // No self-edge survived.
    expect(
      await prisma.prophecyRelationship.count({
        where: { fromId: canonical.id, toId: canonical.id },
      }),
    ).toBe(0);
    // Exactly one supports edge remains, the canonical's own.
    const supports = await prisma.prophecyRelationship.findMany({
      where: { type: "supports", toId: outside.id },
    });
    expect(supports).toHaveLength(1);
    expect(supports[0].note).toBe("canonical keeps this");
    // Nothing is left dangling on the superseded claim.
    expect(
      await prisma.prophecyRelationship.count({
        where: { OR: [{ fromId: duplicate.id }, { toId: duplicate.id }], type: { not: "duplicate_of" } },
      }),
    ).toBe(0);
  });
});

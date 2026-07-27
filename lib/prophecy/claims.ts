import type { Prisma, PrismaClient, ProphecyClaim, ProphecyClaimEntryMap } from "@prisma/client";
import { MATCH_TYPES, MODERATION_STATES, PROPHECY_VOCAB } from "@/lib/prophecy/vocab";

// Prophecy module — canonical claim operations (Phase 2 data layer).
//
// Claims are the normalized propositions the whole module hangs off, so every
// mutation here follows two house rules:
// 1. AUDIT TRAIL: anything that changes a canonical record first snapshots
//    its prior state into ProphecyRevision (append-only; creation snapshots
//    the newborn record instead, since there is no "before").
// 2. NO PROVENANCE LOSS: duplicates are merged by re-pointing and
//    superseding, never by deleting — every source-list entry that mapped to
//    a merged-away claim must still be reachable from the survivor.

// Vocab key sets, computed once. Validation happens against the static vocab
// (the same data the seeder writes) so these functions work without a vocab
// table round-trip.
const CATEGORY_KEYS = new Set(
  PROPHECY_VOCAB.filter((t) => t.kind === "category").map((t) => t.key),
);
const SUBJECT_KEYS = new Set(
  PROPHECY_VOCAB.filter((t) => t.kind === "subject").map((t) => t.key),
);

/**
 * Slugify claim text: lowercase, non-alphanumerics collapse to single
 * hyphens, trimmed, capped at ~80 chars (never ending on a hyphen). Returns
 * "" when the text has no alphanumeric content — callers pick a fallback.
 */
export function claimSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

// Append-only revision snapshot. `record` is the state being preserved —
// callers pass the PRE-edit state for updates (per the schema's contract) and
// the newborn record for creations.
async function writeRevision(
  db: Prisma.TransactionClient | PrismaClient,
  targetType: string,
  targetId: string,
  record: unknown,
  editor: string,
  note: string,
): Promise<void> {
  await db.prophecyRevision.create({
    data: {
      targetType,
      targetId,
      snapshot: JSON.stringify(record),
      editor,
      note,
    },
  });
}

// Find a free slug: base, base-2, base-3, … Collision scans are sequential
// findUniques — claim creation is a low-volume editorial action, not a hot
// path, and the slug @unique backstops any race.
async function uniqueClaimSlug(prisma: PrismaClient, base: string): Promise<string> {
  const stem = base || "claim";
  let candidate = stem;
  for (let n = 2; ; n += 1) {
    const existing = await prisma.prophecyClaim.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${stem}-${n}`;
  }
}

/**
 * Create a normalized claim. Validates non-empty text and that every
 * category/subject key exists in the controlled vocabulary (kind "category" /
 * "subject"); throws on any violation. Slug collisions get -2, -3, …
 * suffixes. Writes a creation revision snapshot; `revisionNote` overrides the
 * default "created" note so loaders can stamp provenance (e.g. which AI model
 * drafted the claim) directly on the creation revision.
 */
export async function createClaim(
  prisma: PrismaClient,
  args: {
    text: string;
    summary?: string;
    categoryKeys?: string[];
    subjectKeys?: string[];
    createdBy?: string;
    revisionNote?: string;
  },
): Promise<ProphecyClaim> {
  const text = args.text?.trim();
  if (!text) throw new Error("createClaim: text must be non-empty");

  const categoryKeys = args.categoryKeys ?? [];
  const subjectKeys = args.subjectKeys ?? [];
  for (const k of categoryKeys) {
    if (!CATEGORY_KEYS.has(k)) throw new Error(`createClaim: unknown category key "${k}"`);
  }
  for (const k of subjectKeys) {
    if (!SUBJECT_KEYS.has(k)) throw new Error(`createClaim: unknown subject key "${k}"`);
  }

  const slug = await uniqueClaimSlug(prisma, claimSlug(text));
  const claim = await prisma.prophecyClaim.create({
    data: {
      slug,
      text,
      summary: args.summary ?? "",
      categoryKeys: JSON.stringify(categoryKeys),
      subjectKeys: JSON.stringify(subjectKeys),
      createdBy: args.createdBy ?? "",
    },
  });
  await writeRevision(
    prisma,
    "claim",
    claim.id,
    claim,
    args.createdBy ?? "",
    args.revisionNote ?? "created",
  );
  return claim;
}

/**
 * Move a claim through the moderation workflow. Validates the status against
 * MODERATION_STATES and snapshots the pre-edit state.
 */
export async function updateClaimStatus(
  prisma: PrismaClient,
  claimId: string,
  status: string,
): Promise<ProphecyClaim> {
  if (!(MODERATION_STATES as readonly string[]).includes(status)) {
    throw new Error(`updateClaimStatus: invalid status "${status}"`);
  }
  const before = await prisma.prophecyClaim.findUnique({ where: { id: claimId } });
  if (!before) throw new Error(`updateClaimStatus: claim ${claimId} not found`);
  await writeRevision(prisma, "claim", claimId, before, "", `status → ${status}`);
  return prisma.prophecyClaim.update({ where: { id: claimId }, data: { status } });
}

/**
 * Map a verbatim source-list entry onto a normalized claim. Upserts on
 * (claimId, entryId) so re-mapping refines rather than duplicates. The
 * entry's mappingStatus flips to "mapped" — or "disputed" when the match
 * itself is disputed — so the unmapped-backlog query stays honest.
 */
export async function mapEntryToClaim(
  prisma: PrismaClient,
  args: {
    claimId: string;
    entryId: string;
    matchType: string;
    confidence: number;
    rationale?: string;
  },
): Promise<ProphecyClaimEntryMap> {
  if (!(MATCH_TYPES as readonly string[]).includes(args.matchType)) {
    throw new Error(`mapEntryToClaim: invalid matchType "${args.matchType}"`);
  }
  if (!Number.isInteger(args.confidence) || args.confidence < 0 || args.confidence > 5) {
    throw new Error(`mapEntryToClaim: confidence must be an integer 0-5, got ${args.confidence}`);
  }

  const map = await prisma.prophecyClaimEntryMap.upsert({
    where: { claimId_entryId: { claimId: args.claimId, entryId: args.entryId } },
    create: {
      claimId: args.claimId,
      entryId: args.entryId,
      matchType: args.matchType,
      confidence: args.confidence,
      rationale: args.rationale ?? "",
    },
    update: {
      matchType: args.matchType,
      confidence: args.confidence,
      rationale: args.rationale ?? "",
    },
  });
  await prisma.prophecySourceListEntry.update({
    where: { id: args.entryId },
    data: { mappingStatus: args.matchType === "disputed" ? "disputed" : "mapped" },
  });
  return map;
}

/**
 * Merge a duplicate claim into a canonical one WITHOUT losing provenance
 * (the handoff's core dedup requirement). In one transaction:
 * - entry maps and passage links move to the canonical claim; pairs the
 *   canonical already has are kept-first (the duplicate's redundant row is
 *   dropped rather than violating the unique constraint);
 * - interpretations and fulfillments re-point to the canonical claim;
 * - the duplicate is marked superseded (status + supersededById) — never
 *   deleted, so its slug, text, and history remain auditable;
 * - a claim→claim duplicate_of relationship records the merge in the
 *   relationship graph;
 * - both claims get pre-merge revision snapshots.
 *
 * Refuses self-merges and merges involving an already-superseded claim
 * (chained merges must target the surviving canonical directly).
 */
export async function mergeClaims(
  prisma: PrismaClient,
  args: { duplicateId: string; canonicalId: string; note?: string },
): Promise<ProphecyClaim> {
  const { duplicateId, canonicalId } = args;
  if (duplicateId === canonicalId) {
    throw new Error("mergeClaims: cannot merge a claim into itself");
  }

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.prophecyClaim.findUnique({ where: { id: duplicateId } });
    const canonical = await tx.prophecyClaim.findUnique({ where: { id: canonicalId } });
    if (!duplicate) throw new Error(`mergeClaims: duplicate claim ${duplicateId} not found`);
    if (!canonical) throw new Error(`mergeClaims: canonical claim ${canonicalId} not found`);
    for (const c of [duplicate, canonical]) {
      if (c.status === "superseded" || c.supersededById) {
        throw new Error(`mergeClaims: claim ${c.slug} is already superseded`);
      }
    }

    // Entry maps: keep-first. The canonical's existing judgment about an
    // entry wins; the duplicate's redundant map is dropped (its provenance is
    // not lost — the entry is still mapped to the canonical claim).
    const canonicalEntryIds = new Set(
      (
        await tx.prophecyClaimEntryMap.findMany({
          where: { claimId: canonicalId },
          select: { entryId: true },
        })
      ).map((m) => m.entryId),
    );
    for (const m of await tx.prophecyClaimEntryMap.findMany({ where: { claimId: duplicateId } })) {
      if (canonicalEntryIds.has(m.entryId)) {
        await tx.prophecyClaimEntryMap.delete({ where: { id: m.id } });
      } else {
        await tx.prophecyClaimEntryMap.update({
          where: { id: m.id },
          data: { claimId: canonicalId },
        });
      }
    }

    // Passage links: same keep-first strategy on (claimId, passageId).
    const canonicalPassageIds = new Set(
      (
        await tx.prophecyClaimPassage.findMany({
          where: { claimId: canonicalId },
          select: { passageId: true },
        })
      ).map((p) => p.passageId),
    );
    for (const p of await tx.prophecyClaimPassage.findMany({ where: { claimId: duplicateId } })) {
      if (canonicalPassageIds.has(p.passageId)) {
        await tx.prophecyClaimPassage.delete({ where: { id: p.id } });
      } else {
        await tx.prophecyClaimPassage.update({
          where: { id: p.id },
          data: { claimId: canonicalId },
        });
      }
    }

    // Interpretations and fulfillments have no per-claim uniques — bulk
    // re-point.
    await tx.prophecyInterpretation.updateMany({
      where: { claimId: duplicateId },
      data: { claimId: canonicalId },
    });
    await tx.prophecyFulfillment.updateMany({
      where: { claimId: duplicateId },
      data: { claimId: canonicalId },
    });

    // Relationship edges: the duplicate's graph position belongs to the
    // survivor too (a `contradicts` or `depends_on` edge is a fact about the
    // proposition, not about which row happened to win the merge), so both
    // incoming and outgoing claim-typed endpoints are re-pointed. Runs BEFORE
    // the duplicate_of edge below is created, so that edge isn't collapsed into
    // a self-reference. Two edges get dropped rather than moved: ones that
    // would become self-edges (duplicate ↔ canonical), and ones that would
    // collide with an edge the canonical already has (the unique is
    // fromType+fromId+toType+toId+type).
    const edgeKey = (fromType: string, fromId: string, toType: string, toId: string, type: string) =>
      `${fromType}|${fromId}|${toType}|${toId}|${type}`;
    const canonicalEdges = new Set(
      (
        await tx.prophecyRelationship.findMany({
          where: {
            OR: [
              { fromType: "claim", fromId: canonicalId },
              { toType: "claim", toId: canonicalId },
            ],
          },
        })
      ).map((r) => edgeKey(r.fromType, r.fromId, r.toType, r.toId, r.type)),
    );
    const duplicateEdges = await tx.prophecyRelationship.findMany({
      where: {
        OR: [
          { fromType: "claim", fromId: duplicateId },
          { toType: "claim", toId: duplicateId },
        ],
      },
    });
    for (const r of duplicateEdges) {
      const fromId = r.fromType === "claim" && r.fromId === duplicateId ? canonicalId : r.fromId;
      const toId = r.toType === "claim" && r.toId === duplicateId ? canonicalId : r.toId;

      const isSelfEdge = r.fromType === "claim" && r.toType === "claim" && fromId === toId;
      const key = edgeKey(r.fromType, fromId, r.toType, toId, r.type);
      if (isSelfEdge || canonicalEdges.has(key)) {
        await tx.prophecyRelationship.delete({ where: { id: r.id } });
        continue;
      }
      canonicalEdges.add(key);
      await tx.prophecyRelationship.update({ where: { id: r.id }, data: { fromId, toId } });
    }

    // Pre-merge snapshots for BOTH claims (states captured above, before any
    // mutation of the claim rows themselves).
    const note = args.note ?? "";
    await writeRevision(
      tx,
      "claim",
      duplicateId,
      duplicate,
      "",
      `merged into ${canonical.slug}${note ? ` — ${note}` : ""}`,
    );
    await writeRevision(
      tx,
      "claim",
      canonicalId,
      canonical,
      "",
      `absorbed ${duplicate.slug}${note ? ` — ${note}` : ""}`,
    );

    // Supersede — never delete. The duplicate stays queryable and its
    // supersededById points readers at the survivor.
    await tx.prophecyClaim.update({
      where: { id: duplicateId },
      data: { status: "superseded", supersededById: canonicalId },
    });

    // Record the merge in the relationship graph (idempotent: skip when the
    // duplicate_of edge already exists).
    const edge = {
      fromType: "claim",
      fromId: duplicateId,
      toType: "claim",
      toId: canonicalId,
      type: "duplicate_of",
    };
    const existingEdge = await tx.prophecyRelationship.findUnique({
      where: { fromType_fromId_toType_toId_type: edge },
      select: { id: true },
    });
    if (!existingEdge) {
      await tx.prophecyRelationship.create({ data: { ...edge, note } });
    }

    return tx.prophecyClaim.findUniqueOrThrow({ where: { id: canonicalId } });
  });
}

/**
 * Search claims. `q` is a case-insensitive `contains` over text/summary/slug
 * (same cheap pattern as lib/articles.ts searchArticles — good enough for an
 * editorial surface, no FTS needed). Optional filters: status, categoryKey,
 * sourceListId (via the entry-map relation).
 *
 * CAVEAT — categoryKey is a coarse match: categoryKeys is a JSON-encoded
 * string[] column, so we `contains` the quoted key ("\"vision\""). The
 * surrounding quotes prevent prefix bleed (searching "person" will NOT match
 * "personal_destiny"), but this is still substring matching on serialized
 * JSON, not a relational join — fine for known vocab keys, not for arbitrary
 * user input.
 */
export type ClaimSearchArgs = {
  q?: string;
  status?: string;
  categoryKey?: string;
  sourceListId?: string;
  take?: number;
  skip?: number;
};

// Shared filter builder so searchClaims and countClaims can never drift — a
// count that doesn't match the rows it describes is worse than no count.
function claimSearchWhere(args: ClaimSearchArgs): Prisma.ProphecyClaimWhereInput | undefined {
  const and: Prisma.ProphecyClaimWhereInput[] = [];

  const q = args.q?.trim();
  if (q) {
    and.push({
      OR: [
        { text: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (args.status) and.push({ status: args.status });
  if (args.categoryKey) {
    and.push({ categoryKeys: { contains: `"${args.categoryKey}"` } });
  }
  if (args.sourceListId) {
    and.push({ entryMaps: { some: { entry: { sourceListId: args.sourceListId } } } });
  }

  return and.length ? { AND: and } : undefined;
}

export async function searchClaims(
  prisma: PrismaClient,
  args: ClaimSearchArgs,
): Promise<ProphecyClaim[]> {
  return prisma.prophecyClaim.findMany({
    where: claimSearchWhere(args),
    // updatedAt alone is not a total order — a bulk draft load stamps hundreds
    // of rows in the same instant, and ties can otherwise reshuffle between
    // pages, hiding rows. id breaks the tie deterministically.
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: args.take ?? 50,
    skip: args.skip ?? 0,
  });
}

/** Total matching claims for the same filters — drives page counts. */
export async function countClaims(prisma: PrismaClient, args: ClaimSearchArgs): Promise<number> {
  return prisma.prophecyClaim.count({ where: claimSearchWhere(args) });
}

export type BulkStatusResult = {
  updated: number;
  /** Merged-away claims, refused for the same reason the per-claim button does. */
  skippedSuperseded: number;
  /** Excluded by minMeanScore — either below it or holding no ratings at all. */
  skippedBelowScore: number;
  /** Already at the target status; counted so the tally always adds up. */
  skippedAlready: number;
};

/**
 * Mean evaluation score per claim, over the claims given.
 *
 * The mean is across every dimension and every rater — the same unweighted
 * formula the review pages disclose (SUMMARY_FORMULA). It is a navigation aid,
 * not a verdict, which is exactly why it's only ever used here as a FILTER over
 * a human's chosen threshold rather than as an automatic publish decision.
 */
export async function claimMeanScores(
  prisma: PrismaClient,
  claimIds: string[],
): Promise<Map<string, number>> {
  if (claimIds.length === 0) return new Map();
  const rows = await prisma.prophecyEvaluation.groupBy({
    by: ["targetId"],
    where: { targetType: "claim", targetId: { in: claimIds } },
    _avg: { score: true },
  });
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r._avg.score != null) out.set(r.targetId, r._avg.score);
  }
  return out;
}

/**
 * Move every claim matching `filters` to `status` in one operation.
 *
 * Publishing is per-claim in the UI, which is right for editorial work but
 * unusable against a corpus of hundreds: a normalization pass loads them all as
 * drafts, and the public surface shows published claims only, so without this
 * the site stays empty until someone clicks several hundred buttons.
 *
 * It deliberately goes through updateClaimStatus one row at a time rather than
 * issuing an updateMany. That costs a query per claim (trivial at this scale)
 * and buys the thing that matters: every transition still lands in the revision
 * log, so a bulk publish is as auditable as a hand-made one.
 *
 * `minMeanScore` gates on evaluation ratings. Claims with NO ratings are
 * excluded whenever a threshold is set — an unrated claim hasn't cleared the
 * bar, it just hasn't been measured, and treating "unknown" as "passing" is how
 * a filter quietly becomes a rubber stamp.
 */
export async function bulkUpdateClaimStatus(
  prisma: PrismaClient,
  args: Omit<ClaimSearchArgs, "status"> & {
    /** Target status to move matching claims TO. */
    status: string;
    /** Selection filter — only claims currently at this status. Distinct from
     *  `status` above, which is the destination. */
    filterStatus?: string;
    minMeanScore?: number;
  },
): Promise<BulkStatusResult> {
  const { status, filterStatus, minMeanScore, ...rest } = args;
  const filters: ClaimSearchArgs = { ...rest, status: filterStatus };
  if (!(MODERATION_STATES as readonly string[]).includes(status)) {
    throw new Error(`bulkUpdateClaimStatus: invalid status "${status}"`);
  }
  // Only mergeClaims may set this, and a merged claim must never be revived —
  // it would put the duplicate back on the public surface while supersededById
  // still points at the survivor.
  if (status === "superseded") {
    throw new Error("bulkUpdateClaimStatus: refusing to bulk-set superseded");
  }

  const candidates = await prisma.prophecyClaim.findMany({
    where: claimSearchWhere(filters),
    select: { id: true, status: true, supersededById: true },
  });

  const result: BulkStatusResult = {
    updated: 0,
    skippedSuperseded: 0,
    skippedBelowScore: 0,
    skippedAlready: 0,
  };

  const live = candidates.filter((c) => {
    if (c.status === "superseded" || c.supersededById) {
      result.skippedSuperseded += 1;
      return false;
    }
    if (c.status === status) {
      result.skippedAlready += 1;
      return false;
    }
    return true;
  });

  let eligible = live;
  if (minMeanScore != null) {
    const means = await claimMeanScores(
      prisma,
      live.map((c) => c.id),
    );
    eligible = live.filter((c) => {
      const mean = means.get(c.id);
      if (mean == null || mean < minMeanScore) {
        result.skippedBelowScore += 1;
        return false;
      }
      return true;
    });
  }

  for (const c of eligible) {
    await updateClaimStatus(prisma, c.id, status);
    result.updated += 1;
  }
  return result;
}

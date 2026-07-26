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
 * suffixes. Writes a creation revision snapshot.
 */
export async function createClaim(
  prisma: PrismaClient,
  args: {
    text: string;
    summary?: string;
    categoryKeys?: string[];
    subjectKeys?: string[];
    createdBy?: string;
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
  await writeRevision(prisma, "claim", claim.id, claim, args.createdBy ?? "", "created");
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
export async function searchClaims(
  prisma: PrismaClient,
  args: {
    q?: string;
    status?: string;
    categoryKey?: string;
    sourceListId?: string;
    take?: number;
  },
): Promise<ProphecyClaim[]> {
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

  return prisma.prophecyClaim.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: { updatedAt: "desc" },
    take: args.take ?? 50,
  });
}

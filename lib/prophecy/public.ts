import type { Prisma, PrismaClient, ProphecyClaim } from "@prisma/client";

// Prophecy module — PUBLIC read model (Phase 4 public browsing).
//
// Every query here filters on status "published". Nothing in this file may
// return draft/submitted/approved-but-unpublished claim CONTENT: unpublished
// claims are invisible — not merely unlinked — on the public surface.
// Source lists and their verbatim entries are provenance context and are
// always visible; only the claim side of the entry↔claim mapping is gated.

const PUBLISHED = "published";

// --- claims index -----------------------------------------------------------

export type PublicClaimListItem = ProphecyClaim & { entryCount: number };

/**
 * List published claims for the public index. `q` is the same cheap
 * case-insensitive `contains` over text/summary/slug as searchClaims;
 * categoryKey/subjectKey match the JSON-encoded key arrays with quoted
 * containment (no prefix bleed). Ordered by text for stable ?page=
 * pagination; returns the filtered total alongside the page.
 */
export async function listPublishedClaims(
  prisma: PrismaClient,
  args: {
    q?: string;
    categoryKey?: string;
    subjectKey?: string;
    take?: number;
    skip?: number;
  } = {},
): Promise<{ claims: PublicClaimListItem[]; total: number }> {
  const and: Prisma.ProphecyClaimWhereInput[] = [{ status: PUBLISHED }];

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
  if (args.categoryKey) and.push({ categoryKeys: { contains: `"${args.categoryKey}"` } });
  if (args.subjectKey) and.push({ subjectKeys: { contains: `"${args.subjectKey}"` } });

  const where: Prisma.ProphecyClaimWhereInput = { AND: and };
  const [rows, total] = await Promise.all([
    prisma.prophecyClaim.findMany({
      where,
      orderBy: [{ text: "asc" }, { id: "asc" }],
      take: args.take ?? 24,
      skip: args.skip ?? 0,
      include: { _count: { select: { entryMaps: true } } },
    }),
    prisma.prophecyClaim.count({ where }),
  ]);

  return {
    claims: rows.map(({ _count, ...claim }) => ({ ...claim, entryCount: _count.entryMaps })),
    total,
  };
}

// --- claim detail -----------------------------------------------------------

export type PublicClaimEntryMap = {
  id: string;
  matchType: string;
  confidence: number;
  rationale: string;
  entry: {
    id: string;
    entryNumber: string;
    originalWording: string;
    originalPassageRefs: string;
    sourceList: { slug: string; title: string };
  };
};

export type PublicClaimRelationship = {
  id: string;
  type: string;
  note: string;
  direction: "out" | "in"; // out = this claim → counterpart
  claim: { slug: string; text: string };
};

export type PublicClaimDetail = ProphecyClaim & {
  entryMaps: PublicClaimEntryMap[];
  relationships: PublicClaimRelationship[];
  revisions: Array<{ createdAt: Date; note: string }>;
  // Only set when the counterpart is itself published — unpublished claims
  // are never linked from the public surface.
  supersededByPublished: { slug: string; text: string } | null;
  supersedesPublished: Array<{ slug: string; text: string }>;
};

/**
 * One published claim with its provenance: mapped verbatim entries (with
 * list, matchType, confidence, rationale), claim↔claim relationships in both
 * directions (counterpart must be published), revision metadata (createdAt +
 * note only — snapshots stay private), and published-only supersession links.
 * Returns null for unknown slugs AND for any non-published status.
 */
export async function getPublishedClaim(
  prisma: PrismaClient,
  slug: string,
): Promise<PublicClaimDetail | null> {
  const claim = await prisma.prophecyClaim.findFirst({
    where: { slug, status: PUBLISHED },
    include: {
      entryMaps: {
        orderBy: { createdAt: "asc" },
        include: {
          entry: {
            select: {
              id: true,
              entryNumber: true,
              originalWording: true,
              originalPassageRefs: true,
              sourceList: { select: { slug: true, title: true } },
            },
          },
        },
      },
      supersededBy: { select: { slug: true, text: true, status: true } },
      supersedes: { where: { status: PUBLISHED }, select: { slug: true, text: true } },
    },
  });
  if (!claim) return null;

  const [rels, revisions] = await Promise.all([
    prisma.prophecyRelationship.findMany({
      where: {
        OR: [
          { fromType: "claim", fromId: claim.id, toType: "claim" },
          { fromType: "claim", toType: "claim", toId: claim.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.prophecyRevision.findMany({
      where: { targetType: "claim", targetId: claim.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, note: true },
    }),
  ]);

  // Resolve counterparts, keeping only PUBLISHED ones — an edge to an
  // unpublished claim is dropped entirely rather than shown unlinked.
  const otherIds = new Set<string>();
  for (const r of rels) otherIds.add(r.fromId === claim.id ? r.toId : r.fromId);
  otherIds.delete(claim.id);
  const others = otherIds.size
    ? await prisma.prophecyClaim.findMany({
        where: { id: { in: [...otherIds] }, status: PUBLISHED },
        select: { id: true, slug: true, text: true },
      })
    : [];
  const otherById = new Map(others.map((c) => [c.id, c]));

  const relationships: PublicClaimRelationship[] = [];
  for (const r of rels) {
    const direction: "out" | "in" = r.fromId === claim.id ? "out" : "in";
    const other = otherById.get(direction === "out" ? r.toId : r.fromId);
    if (!other) continue;
    relationships.push({
      id: r.id,
      type: r.type,
      note: r.note,
      direction,
      claim: { slug: other.slug, text: other.text },
    });
  }

  const { entryMaps, supersededBy, supersedes, ...scalars } = claim;
  return {
    ...(scalars as ProphecyClaim),
    entryMaps: entryMaps.map((m) => ({
      id: m.id,
      matchType: m.matchType,
      confidence: m.confidence,
      rationale: m.rationale,
      entry: m.entry,
    })),
    relationships,
    revisions,
    supersededByPublished:
      supersededBy && supersededBy.status === PUBLISHED
        ? { slug: supersededBy.slug, text: supersededBy.text }
        : null,
    supersedesPublished: supersedes,
  };
}

// --- landing stats ----------------------------------------------------------

/**
 * Cheap counts for the public landing page. List/entry counts are provenance
 * (always shown); the claim count is published-only. Distinct passage keys
 * are skipped — no cheap query exists for them yet.
 */
export async function publicStats(prisma: PrismaClient): Promise<{
  publishedClaims: number;
  sourceLists: number;
  entries: number;
}> {
  const [publishedClaims, sourceLists, entries] = await Promise.all([
    prisma.prophecyClaim.count({ where: { status: PUBLISHED } }),
    prisma.prophecySourceList.count(),
    prisma.prophecySourceListEntry.count(),
  ]);
  return { publishedClaims, sourceLists, entries };
}

// --- source lists -----------------------------------------------------------

export type PublicSourceListSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  claimedCount: number | null;
  entryCount: number;
  publishedMappedCount: number; // entries mapped to ≥1 published claim
};

/**
 * All source lists with their actual entry count and how many entries map to
 * at least one published claim. Lists are verbatim provenance — every list is
 * public regardless of claim review progress.
 */
export async function listSourceLists(prisma: PrismaClient): Promise<PublicSourceListSummary[]> {
  const lists = await prisma.prophecySourceList.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { entries: true } } },
  });
  return Promise.all(
    lists.map(async (l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      claimedCount: l.claimedCount,
      entryCount: l._count.entries,
      publishedMappedCount: await prisma.prophecySourceListEntry.count({
        where: {
          sourceListId: l.id,
          claimMaps: { some: { claim: { status: PUBLISHED } } },
        },
      }),
    })),
  );
}

export type PublicSourceListEntry = {
  id: string;
  entryNumber: string;
  originalWording: string;
  originalPassageRefs: string;
  originalFulfillmentRefs: string;
  claims: Array<{
    slug: string;
    text: string;
    matchType: string;
    confidence: number;
    rationale: string;
  }>;
};

export type PublicSourceListDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  claimedCount: number | null;
  createdAt: Date;
  sourceTitle: string; // "" when the list has no bibliographic source
  sourceUrl: string; // "" when the source has no URL
  entries: PublicSourceListEntry[];
};

// entryNumber is a verbatim string ("1", "12", "8a") — sort by numeric prefix
// first, then the full string, so "2" precedes "10" but "8a" follows "8".
function entryNumberCompare(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  const ka = Number.isNaN(na) ? Number.POSITIVE_INFINITY : na;
  const kb = Number.isNaN(nb) ? Number.POSITIVE_INFINITY : nb;
  if (ka !== kb) return ka - kb;
  return a.localeCompare(b);
}

/**
 * One source list with every verbatim entry (entryNumber ascending, numeric
 * where possible). Per entry, only mappings whose claim is published are
 * exposed; entries mapped solely to unpublished claims come back with an
 * empty `claims` array, indistinguishable from unmapped ones.
 */
export async function getSourceList(
  prisma: PrismaClient,
  slug: string,
): Promise<PublicSourceListDetail | null> {
  const list = await prisma.prophecySourceList.findUnique({
    where: { slug },
    include: {
      source: { select: { title: true, url: true } },
      entries: {
        include: {
          claimMaps: {
            where: { claim: { status: PUBLISHED } },
            orderBy: { createdAt: "asc" },
            include: { claim: { select: { slug: true, text: true } } },
          },
        },
      },
    },
  });
  if (!list) return null;

  const entries = [...list.entries]
    .sort((a, b) => entryNumberCompare(a.entryNumber, b.entryNumber))
    .map((e) => ({
      id: e.id,
      entryNumber: e.entryNumber,
      originalWording: e.originalWording,
      originalPassageRefs: e.originalPassageRefs,
      originalFulfillmentRefs: e.originalFulfillmentRefs,
      claims: e.claimMaps.map((m) => ({
        slug: m.claim.slug,
        text: m.claim.text,
        matchType: m.matchType,
        confidence: m.confidence,
        rationale: m.rationale,
      })),
    }));

  return {
    id: list.id,
    slug: list.slug,
    title: list.title,
    description: list.description,
    claimedCount: list.claimedCount,
    createdAt: list.createdAt,
    sourceTitle: list.source?.title ?? "",
    sourceUrl: list.source?.url ?? "",
    entries,
  };
}

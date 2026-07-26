import type { PrismaClient } from "@prisma/client";
import { csvEscape } from "@/lib/prophecy/import";

// Prophecy module — claim export (Phase 2 data layer).
//
// Two shapes for two audiences:
// - JSON: the full nested read model (entries, passages, fulfillments,
//   evaluation summaries) for programmatic reuse and offline analysis;
// - CSV: one flat row per claim for spreadsheet triage.
// Exports include ALL claims regardless of moderation status — this is an
// operator/audit surface, not a public feed; publication filtering is the
// caller's job.

// Defensive JSON.parse for the string[]-in-a-String columns.
function parseKeys(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

// One query for the nested claim graph, one for the polymorphic evaluations
// (no FK relation to join through — see the schema's polymorphic-targets
// banner). Ordered by slug for stable, diffable output.
async function loadClaims(prisma: PrismaClient) {
  const claims = await prisma.prophecyClaim.findMany({
    orderBy: { slug: "asc" },
    include: {
      entryMaps: {
        include: { entry: { include: { sourceList: { select: { slug: true, title: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      passageLinks: {
        include: { passage: { include: { document: { select: { slug: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      fulfillments: { orderBy: { createdAt: "asc" } },
    },
  });

  const evaluations = claims.length
    ? await prisma.prophecyEvaluation.findMany({
        where: { targetType: "claim", targetId: { in: claims.map((c) => c.id) } },
        include: { reviewer: { select: { slug: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const evalsByClaim = new Map<string, typeof evaluations>();
  for (const e of evaluations) {
    const list = evalsByClaim.get(e.targetId) ?? [];
    list.push(e);
    evalsByClaim.set(e.targetId, list);
  }

  return { claims, evalsByClaim };
}

/**
 * Export every claim (any status) as pretty-printed JSON: slug, text,
 * summary, status, categories, subjects, mapped entries (source-list
 * slug/title, entryNumber, originalWording, matchType, confidence), passages
 * (document/ref), fulfillments (description, direction), and evaluation
 * summaries (reviewer slug, dimension, score, label, status).
 */
export async function exportClaimsJSON(prisma: PrismaClient): Promise<string> {
  const { claims, evalsByClaim } = await loadClaims(prisma);

  const out = claims.map((c) => ({
    slug: c.slug,
    text: c.text,
    summary: c.summary,
    status: c.status,
    categories: parseKeys(c.categoryKeys),
    subjects: parseKeys(c.subjectKeys),
    entries: c.entryMaps.map((m) => ({
      sourceList: m.entry.sourceList.slug,
      sourceListTitle: m.entry.sourceList.title,
      entryNumber: m.entry.entryNumber,
      originalWording: m.entry.originalWording,
      matchType: m.matchType,
      confidence: m.confidence,
    })),
    passages: c.passageLinks.map((p) => ({
      document: p.passage.document.slug,
      ref: p.passage.ref,
    })),
    fulfillments: c.fulfillments.map((f) => ({
      description: f.description,
      direction: f.direction,
    })),
    evaluations: (evalsByClaim.get(c.id) ?? []).map((e) => ({
      reviewer: e.reviewer.slug,
      dimension: e.dimension,
      score: e.score,
      label: e.label,
      status: e.status,
    })),
  }));

  return JSON.stringify(out, null, 2);
}

/**
 * Export every claim as flat CSV, one row per claim: slug, text, status,
 * categoryKeys (semicolon-joined), entryCount, entryNumbers (semicolon-joined
 * "sourceListSlug:entryNumber"), passageRefs (semicolon-joined), and
 * fulfillmentDirections (semicolon-joined). Escaping via the shared
 * RFC-4180 helper in import.ts, so exports re-import cleanly.
 */
export async function exportClaimsCSV(prisma: PrismaClient): Promise<string> {
  const { claims } = await loadClaims(prisma);

  const header = [
    "slug",
    "text",
    "status",
    "categoryKeys",
    "entryCount",
    "entryNumbers",
    "passageRefs",
    "fulfillmentDirections",
  ];
  const lines = [header.join(",")];

  for (const c of claims) {
    const cells = [
      c.slug,
      c.text,
      c.status,
      parseKeys(c.categoryKeys).join(";"),
      String(c.entryMaps.length),
      c.entryMaps.map((m) => `${m.entry.sourceList.slug}:${m.entry.entryNumber}`).join(";"),
      c.passageLinks.map((p) => p.passage.ref).join(";"),
      c.fulfillments.map((f) => f.direction).join(";"),
    ];
    lines.push(cells.map(csvEscape).join(","));
  }

  return lines.join("\n") + "\n";
}

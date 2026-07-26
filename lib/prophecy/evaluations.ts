import type { PrismaClient } from "@prisma/client";
import { PROPHECY_VOCAB, SCORE_LABELS } from "@/lib/prophecy/vocab";

// Prophecy module — Phase 5 evaluation storage (the "editorial analysis"
// layer). Same house rules as draftload.ts, for the same reasons:
//
// - PROVENANCE IS MANDATORY. meta.model/promptVersion/generatedAt/pass must
//   all be present or the WHOLE file is refused. A rating with no audit trail
//   is worse than no rating: it looks like considered editorial judgement.
// - ATTRIBUTION IS NOT OPTIONAL. Every machine-produced evaluation is
//   attributed to its own ProphecyReviewer (resolved-or-created per
//   model+pass), never to the human editor. The handoff's rating requirements
//   list "reviewer" and "reviewer perspective" as stored fields precisely so a
//   reader can discount a score by who produced it.
// - NEVER OVERWRITE. ProphecyEvaluation rows are append-only here: an
//   existing (reviewer, target, dimension) row is SKIPPED, never updated.
//   Disagreement between reviewers is the signal we want to keep, not a
//   conflict to resolve by last-write-wins.
// - NO UNEXPLAINED SCORES. A blank rationale is refused per item — the
//   handoff mandates written rationale, and the UI must never render a bare
//   number.
// - DEGRADE PER ITEM. An unknown claim slug or bad dimension key becomes an
//   error string; the rest of the file still loads.
//
// Everything lands as status "draft". A machine pass proposes; a human
// promotes.

// Shape of a drafts file (data/prophecy/evaluations-*.json). `pass` is what
// makes two independent runs distinguishable — it is half the reviewer
// identity, and two passes disagreeing is the entire point (see
// evaluationDisagreements below).
export type EvalDraftFile = {
  meta: { model: string; promptVersion: string; generatedAt: string; pass: string };
  evaluations: Array<{
    claimSlug: string;
    dimensionKey: string;
    dimensionKind: string;
    score: number;
    rationale: string;
    confidence: number;
  }>;
};

export type EvalLoadResult = {
  created: number;
  skipped: number;
  errors: string[];
  // "" when the file was refused before a reviewer could be resolved.
  reviewerId: string;
};

// Only these two kinds can be attached to a claim. resolution_dimension
// exists in the vocab but targets a resolution, not a claim — accepting it
// here would silently mis-file ratings.
const CLAIM_DIMENSION_KINDS = ["prediction_dimension", "fulfillment_dimension"] as const;

// key → kind lookups, built once from the static vocab (same data the seeder
// writes, so no vocab-table round-trip is needed to validate).
const DIMENSION_KEYS: Record<string, Set<string>> = {
  prediction_dimension: new Set(
    PROPHECY_VOCAB.filter((t) => t.kind === "prediction_dimension").map((t) => t.key),
  ),
  fulfillment_dimension: new Set(
    PROPHECY_VOCAB.filter((t) => t.kind === "fulfillment_dimension").map((t) => t.key),
  ),
};

// Position of each dimension within its kind — the DB's sortOrder is assigned
// from exactly this ordering by the seeder, so reading it from the static
// vocab keeps display order stable without joining ProphecyVocabTerm.
const DIMENSION_META = new Map<
  string,
  { kind: string; label: string; sortOrder: number }
>();
for (const kind of CLAIM_DIMENSION_KINDS) {
  PROPHECY_VOCAB.filter((t) => t.kind === kind).forEach((t, i) => {
    // Prediction and fulfillment key sets are disjoint, so a claim-targeted
    // evaluation's kind is recoverable from its dimension key alone (the
    // stored row only carries the key). resolution_dimension DOES collide
    // with prediction on "falsifiability" — which is why it is excluded from
    // this map and from claim targets entirely.
    DIMENSION_META.set(t.key, { kind, label: t.label, sortOrder: i });
  });
}

// Kind ordering for display: prediction quality first, then fulfillment —
// you judge whether it was a prediction before judging whether it came true.
const KIND_ORDER: Record<string, number> = {
  prediction_dimension: 0,
  fulfillment_dimension: 1,
};

// --- shape helpers (manual validation — the repo takes no zod) -------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Non-empty trimmed string or null.
function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

// Whole number within [0, 5] or null. Rejects floats, NaN, and numeric
// strings — a score of "4" from a sloppy generator is a bug, not a 4.
function score0to5(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  if (v < 0 || v > 5) return null;
  return v;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Resolve-or-create the ProphecyReviewer that owns a machine pass.
 *
 * One reviewer per (model, pass): re-running the same file reuses the same
 * row (so idempotency holds), while a SECOND pass gets its own identity and
 * can therefore disagree with the first on the record. The perspective field
 * is deliberately blunt — an automated rater declares no tradition, and
 * readers must not mistake it for a human editorial position.
 */
async function resolveReviewer(
  prisma: PrismaClient,
  model: string,
  pass: string,
): Promise<string> {
  const slug = slugify(`ai-${model}-${pass}`) || "ai-rater";
  const existing = await prisma.prophecyReviewer.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.prophecyReviewer.create({
    data: {
      slug,
      displayName: `Automated rater (${pass})`,
      perspective: "Automated rater; no declared tradition",
      bio: `Machine-generated ratings from pass "${pass}". Draft status only — every score awaits human review.`,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Load a machine-generated evaluation drafts file.
 *
 * File-level problems (unparseable JSON, wrong top-level shape, missing
 * provenance meta) refuse the whole file with a single error and zero writes.
 * Otherwise each evaluation is validated and written independently:
 * - unknown claimSlug / dimension kind / dimension key → per-item error;
 * - non-integer or out-of-range score/confidence → per-item error;
 * - blank rationale → per-item error (an unexplained score is refused);
 * - an existing (reviewer, claim, dimension) row → skipped, NEVER updated.
 */
export async function loadEvaluationDrafts(
  prisma: PrismaClient,
  fileText: string,
): Promise<EvalLoadResult> {
  const result: EvalLoadResult = { created: 0, skipped: 0, errors: [], reviewerId: "" };
  const refuse = (msg: string): EvalLoadResult => ({
    created: 0,
    skipped: 0,
    errors: [msg],
    reviewerId: "",
  });

  // --- file-level validation: any failure here refuses the whole file ------
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch (e) {
    return refuse(`invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isRecord(parsed)) return refuse("invalid file: expected a top-level object");

  const meta = parsed.meta;
  if (!isRecord(meta)) {
    return refuse(
      "invalid file: missing meta — provenance is mandatory for machine output, refusing the whole file",
    );
  }
  const model = str(meta.model);
  const promptVersion = str(meta.promptVersion);
  const generatedAt = str(meta.generatedAt);
  const pass = str(meta.pass);
  if (!model || !promptVersion || !generatedAt || !pass) {
    return refuse(
      "invalid file: meta.model, meta.promptVersion, meta.generatedAt, and meta.pass are required — provenance is mandatory for machine output, refusing the whole file",
    );
  }

  const rows = parsed.evaluations;
  if (!Array.isArray(rows)) return refuse("invalid file: evaluations must be an array");

  // Reviewer resolution is the first DB write, and it happens only after the
  // file has passed every file-level check — a refused file leaves no trace.
  const reviewerId = await resolveReviewer(prisma, model, pass);
  result.reviewerId = reviewerId;

  // claimSlug → id (null = known-missing), cached: drafts files carry many
  // dimensions per claim, so this collapses ~20 lookups per claim into one.
  const claimIdBySlug = new Map<string, string | null>();
  const resolveClaimId = async (slug: string): Promise<string | null> => {
    if (!claimIdBySlug.has(slug)) {
      const claim = await prisma.prophecyClaim.findUnique({
        where: { slug },
        select: { id: true },
      });
      claimIdBySlug.set(slug, claim?.id ?? null);
    }
    return claimIdBySlug.get(slug) ?? null;
  };

  for (let i = 0; i < rows.length; i += 1) {
    const raw: unknown = rows[i];
    const label = () => {
      if (isRecord(raw)) {
        const cs = str(raw.claimSlug);
        const dk = str(raw.dimensionKey);
        if (cs && dk) return `evaluation ${cs}/${dk}`;
      }
      return `evaluation #${i + 1}`;
    };

    try {
      if (!isRecord(raw)) {
        result.errors.push(`${label()}: not an object`);
        continue;
      }
      const claimSlug = str(raw.claimSlug);
      const dimensionKey = str(raw.dimensionKey);
      const dimensionKind = str(raw.dimensionKind);
      if (!claimSlug || !dimensionKey || !dimensionKind) {
        result.errors.push(
          `${label()}: claimSlug, dimensionKey and dimensionKind are required non-empty strings`,
        );
        continue;
      }

      const known = DIMENSION_KEYS[dimensionKind];
      if (!known) {
        result.errors.push(
          `${label()}: unknown dimensionKind "${dimensionKind}" — claim evaluations accept ${CLAIM_DIMENSION_KINDS.join(" or ")}`,
        );
        continue;
      }
      if (!known.has(dimensionKey)) {
        result.errors.push(
          `${label()}: unknown dimensionKey "${dimensionKey}" for kind "${dimensionKind}"`,
        );
        continue;
      }

      const score = score0to5(raw.score);
      if (score === null) {
        result.errors.push(`${label()}: score must be a whole number from 0 to 5`);
        continue;
      }
      const confidence = score0to5(raw.confidence);
      if (confidence === null) {
        result.errors.push(`${label()}: confidence must be a whole number from 0 to 5`);
        continue;
      }
      const rationale = str(raw.rationale);
      if (!rationale) {
        result.errors.push(
          `${label()}: rationale is required — an unexplained score is refused`,
        );
        continue;
      }

      const claimId = await resolveClaimId(claimSlug);
      if (!claimId) {
        result.errors.push(`${label()}: unknown claim slug "${claimSlug}"`);
        continue;
      }

      // Idempotency key: one score per reviewer per dimension per target.
      // There is no unique index on the polymorphic target (app-layer
      // integrity, per the schema banner), so the check is a findFirst.
      const existing = await prisma.prophecyEvaluation.findFirst({
        where: {
          reviewerId,
          targetType: "claim",
          targetId: claimId,
          dimension: dimensionKey,
        },
        select: { id: true },
      });
      if (existing) {
        result.skipped += 1;
        continue;
      }

      await prisma.prophecyEvaluation.create({
        data: {
          reviewerId,
          targetType: "claim",
          targetId: claimId,
          dimension: dimensionKey,
          score,
          // The descriptive label is stored alongside the number so an
          // export never has to re-derive the scale (handoff: rating
          // requirements list both).
          label: SCORE_LABELS[score],
          rationale,
          confidence,
          status: "draft",
        },
      });
      result.created += 1;
    } catch (e) {
      result.errors.push(`${label()}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

// --- read model -------------------------------------------------------------

export type ClaimEvaluationRow = {
  dimensionKind: string;
  dimensionKey: string;
  label: string; // human label from the controlled vocabulary
  score: number;
  scoreLabel: string; // SCORE_LABELS[score]
  rationale: string;
  confidence: number;
  reviewerSlug: string;
  status: string;
};

/**
 * Every evaluation attached to one claim, ordered by dimension kind then the
 * vocab's own sort order — so the same dimensions appear in the same places
 * on every claim page and a missing dimension reads as a gap, not as noise.
 * Rows whose dimension is not in the claim-dimension vocab are dropped
 * (stale key from a renamed term) rather than rendered as a raw key.
 */
export async function claimEvaluations(
  prisma: PrismaClient,
  claimId: string,
): Promise<ClaimEvaluationRow[]> {
  const rows = await prisma.prophecyEvaluation.findMany({
    where: { targetType: "claim", targetId: claimId },
    include: { reviewer: { select: { slug: true } } },
  });

  return rows
    .flatMap((r) => {
      const meta = DIMENSION_META.get(r.dimension);
      if (!meta) return [];
      return [
        {
          dimensionKind: meta.kind,
          dimensionKey: r.dimension,
          label: meta.label,
          score: r.score,
          scoreLabel: SCORE_LABELS[r.score] ?? String(r.score),
          rationale: r.rationale,
          confidence: r.confidence,
          reviewerSlug: r.reviewer.slug,
          status: r.status,
          _sort: meta.sortOrder,
        },
      ];
    })
    .sort(
      (a, b) =>
        (KIND_ORDER[a.dimensionKind] ?? 99) - (KIND_ORDER[b.dimensionKind] ?? 99) ||
        a._sort - b._sort ||
        a.reviewerSlug.localeCompare(b.reviewerSlug),
    )
    .map(({ _sort, ...row }) => row);
}

export type EvaluationDisagreement = {
  claimId: string;
  claimSlug: string;
  claimText: string;
  dimensionKey: string;
  dimensionKind: string;
  scores: Array<{ reviewerSlug: string; score: number; rationale: string }>;
  gap: number;
};

/**
 * Claim+dimension pairs where two or more reviewers scored differently,
 * widest gap first.
 *
 * THIS IS THE POINT of running more than one rating pass. Agreement is cheap
 * and uninformative; a two-reviewer split on "prior dating" is exactly where
 * a human should spend their attention. Default minGap 2 filters out the
 * off-by-one noise that two independent raters always produce.
 *
 * Superseded and rejected evaluations are excluded — a retracted score must
 * not manufacture a disagreement with a live one.
 */
export async function evaluationDisagreements(
  prisma: PrismaClient,
  opts?: { minGap?: number },
): Promise<EvaluationDisagreement[]> {
  const minGap = opts?.minGap ?? 2;

  const rows = await prisma.prophecyEvaluation.findMany({
    where: {
      targetType: "claim",
      status: { notIn: ["superseded", "rejected"] },
    },
    include: { reviewer: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Group in memory: the grouping key is (claim, dimension) and the payload
  // is per-reviewer scores — neither expressible as a single groupBy, and the
  // evaluation table is editorial-scale (thousands, not millions).
  type Bucket = {
    claimId: string;
    dimensionKey: string;
    scores: Array<{ reviewerSlug: string; score: number; rationale: string }>;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    if (!DIMENSION_META.has(r.dimension)) continue; // stale/foreign key
    const key = `${r.targetId}::${r.dimension}`;
    let b = buckets.get(key);
    if (!b) {
      b = { claimId: r.targetId, dimensionKey: r.dimension, scores: [] };
      buckets.set(key, b);
    }
    b.scores.push({ reviewerSlug: r.reviewer.slug, score: r.score, rationale: r.rationale });
  }

  const conflicts: Array<Bucket & { gap: number }> = [];
  for (const b of buckets.values()) {
    // Two or more DISTINCT reviewers — one reviewer's own re-rating is a
    // revision, not a disagreement.
    const reviewers = new Set(b.scores.map((s) => s.reviewerSlug));
    if (reviewers.size < 2) continue;
    const values = b.scores.map((s) => s.score);
    const gap = Math.max(...values) - Math.min(...values);
    if (gap < minGap || gap === 0) continue;
    conflicts.push({ ...b, gap });
  }
  if (conflicts.length === 0) return [];

  const claims = await prisma.prophecyClaim.findMany({
    where: { id: { in: [...new Set(conflicts.map((c) => c.claimId))] } },
    select: { id: true, slug: true, text: true },
  });
  const claimById = new Map(claims.map((c) => [c.id, c]));

  return conflicts
    .map((c) => {
      const claim = claimById.get(c.claimId);
      return {
        claimId: c.claimId,
        claimSlug: claim?.slug ?? c.claimId,
        claimText: claim?.text ?? "(claim missing)",
        dimensionKey: c.dimensionKey,
        dimensionKind: DIMENSION_META.get(c.dimensionKey)?.kind ?? "",
        // Highest score first so the two poles of the disagreement read
        // side by side.
        scores: [...c.scores].sort((a, b) => b.score - a.score),
        gap: c.gap,
      };
    })
    .sort(
      (a, b) =>
        b.gap - a.gap ||
        a.claimSlug.localeCompare(b.claimSlug) ||
        a.dimensionKey.localeCompare(b.dimensionKey),
    );
}

/**
 * Human label for a claim dimension key ("" when unknown). Exported so the
 * review pages don't each re-derive the vocab lookup.
 */
export function dimensionLabel(key: string): string {
  return DIMENSION_META.get(key)?.label ?? key;
}

// Display headings per dimension kind, shared by the claim detail page and
// the disagreement queue.
export const DIMENSION_KIND_LABELS: Record<string, string> = {
  prediction_dimension: "Prediction quality",
  fulfillment_dimension: "Fulfillment quality",
};

// --- summary scores ---------------------------------------------------------
//
// The handoff permits a computed summary but forbids an unexplained one: it
// "must never replace the component scores and must disclose its formula."
// So every consumer of these helpers renders SUMMARY_FORMULA alongside the
// number, and the per-dimension rows stay on the page.

export const SUMMARY_FORMULA =
  "Unweighted mean of the component dimension scores on the 0–5 scale, averaged across raters where more than one rated a dimension. Not a verdict on the claim.";

export type ScoreSummary = {
  kind: string;
  mean: number | null; // null when nothing has been rated yet
  dimensionCount: number;
  ratingCount: number;
};

/**
 * Per-kind means for one claim's evaluation rows. Averages per dimension
 * first, then across dimensions, so a dimension rated by two passes doesn't
 * count double against one rated by a single pass.
 */
export function summarizeClaimScores(rows: ClaimEvaluationRow[]): ScoreSummary[] {
  const byKind = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    const dims = byKind.get(r.dimensionKind) ?? new Map<string, number[]>();
    const scores = dims.get(r.dimensionKey) ?? [];
    scores.push(r.score);
    dims.set(r.dimensionKey, scores);
    byKind.set(r.dimensionKind, dims);
  }

  return [...byKind.entries()].map(([kind, dims]) => {
    const perDimension = [...dims.values()].map(
      (scores) => scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    const ratingCount = [...dims.values()].reduce((n, s) => n + s.length, 0);
    return {
      kind,
      mean: perDimension.length
        ? perDimension.reduce((a, b) => a + b, 0) / perDimension.length
        : null,
      dimensionCount: dims.size,
      ratingCount,
    };
  });
}

export type DimensionStat = {
  dimensionKind: string;
  dimensionKey: string;
  mean: number;
  claimsRated: number;
};

/**
 * Corpus-wide mean per dimension — the "where does this whole corpus sit"
 * view. Ordered weakest-first, because the low end is what a reader of a
 * prophecy-claims database actually wants to interrogate.
 */
export async function corpusDimensionStats(prisma: PrismaClient): Promise<DimensionStat[]> {
  // The column is a bare vocab key; the kind lives in the vocabulary, not the
  // row, so resolve it here rather than denormalizing it into the table.
  const kindByKey = new Map(PROPHECY_VOCAB.map((t) => [t.key, t.kind]));

  const grouped = await prisma.prophecyEvaluation.groupBy({
    by: ["dimension"],
    where: { targetType: "claim" },
    _avg: { score: true },
    _count: { _all: true },
  });

  return grouped
    .map((g) => ({
      dimensionKind: kindByKey.get(g.dimension) ?? "unknown",
      dimensionKey: g.dimension,
      mean: g._avg.score ?? 0,
      claimsRated: g._count._all,
    }))
    .sort((a, b) => a.mean - b.mean);
}

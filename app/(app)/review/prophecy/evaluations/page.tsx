export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  DIMENSION_KIND_LABELS,
  SUMMARY_FORMULA,
  corpusDimensionStats,
  dimensionLabel,
  evaluationDisagreements,
} from "@/lib/prophecy/evaluations";
import { PageHead, requireProphecyPageAuth, scoreLabel, truncate } from "../shared";

// Prophecy admin — evaluation overview.
//
// Ordered by what an editor actually needs, in order:
//   1. Where does the corpus sit — the aggregate, weakest dimensions first.
//   2. Where do raters disagree — the queue worth a human's attention.
//
// Rationales are the bulk of the text, so the numbers lead and the prose sits
// behind <details>. That's native HTML: no client component, no JS, which
// keeps this surface's server-components-only rule intact.
//
// The aggregate obeys the handoff's rule on computed summaries — it is shown
// WITH its formula and never replaces the component scores, which stay both
// here (per dimension) and on each claim page (per rating).

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</div> : null}
    </div>
  );
}

// A 0-5 mean drawn as a proportional bar. Deliberately NOT colour-coded
// good/bad: a low score on `explicitness` describes what a typological reading
// is, it isn't a mark against the claim.
function ScoreBar({ mean }: { mean: number }) {
  const pct = Math.max(0, Math.min(100, (mean / 5) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs font-semibold">{mean.toFixed(2)}</span>
    </div>
  );
}

export default async function ProphecyEvaluationsPage() {
  await requireProphecyPageAuth();

  const [total, byDimension, reviewers, coveredClaims, disagreements] = await Promise.all([
    prisma.prophecyEvaluation.count({ where: { targetType: "claim" } }),
    corpusDimensionStats(prisma),
    prisma.prophecyEvaluation.groupBy({
      by: ["reviewerId"],
      where: { targetType: "claim" },
      _count: { _all: true },
    }),
    prisma.prophecyEvaluation.groupBy({
      by: ["targetId"],
      where: { targetType: "claim" },
      _count: { _all: true },
    }),
    evaluationDisagreements(prisma, { minGap: 2 }),
  ]);

  const overall =
    byDimension.length > 0
      ? byDimension.reduce((a, d) => a + d.mean, 0) / byDimension.length
      : null;

  const byKind = new Map<string, typeof byDimension>();
  for (const d of byDimension) {
    byKind.set(d.dimensionKind, [...(byKind.get(d.dimensionKind) ?? []), d]);
  }

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead
        title="Evaluations"
        blurb="Dimensional ratings across the claim corpus. Scores are drafts produced by automated raters — not editorial judgement — and each one carries a written rationale."
      />

      {total === 0 ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
          No evaluations loaded yet. Generate a pass with <code>npm run prophecy:evaluate</code>,
          then load it with <code>npm run prophecy:evals</code>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Overall mean"
              value={overall == null ? "—" : overall.toFixed(2)}
              hint="of 5 · formula below"
            />
            <Stat label="Ratings" value={total.toLocaleString()} />
            <Stat label="Claims rated" value={coveredClaims.length.toLocaleString()} />
            <Stat
              label="Raters"
              value={reviewers.length}
              hint={reviewers.length === 1 ? "one pass — no splits" : "independent passes"}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>How the means are computed:</strong> {SUMMARY_FORMULA} The per-dimension
            scores below, and the per-rating scores on each claim page, are the actual finding —
            this number is a navigation aid, not a result.
          </p>

          {[...byKind.entries()].map(([kind, dims]) => (
            <section key={kind}>
              <h2 className="text-lg font-bold">
                {DIMENSION_KIND_LABELS[kind] ?? kind.replace(/_/g, " ")}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Corpus mean per dimension, weakest first.
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {dims.map((d) => (
                  <div
                    key={d.dimensionKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <span className="text-sm">{dimensionLabel(d.dimensionKey)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {scoreLabel(Math.round(d.mean))}
                      </span>
                      <ScoreBar mean={d.mean} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-bold">Rater disagreements ({disagreements.length})</h2>
            {disagreements.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {reviewers.length < 2
                  ? "Only one rating pass is loaded, so there is nothing to disagree about yet. Run a second pass with a different model to populate this queue — it is where reading time pays off most."
                  : "The raters agree within 1 point everywhere. Nothing needs adjudication."}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {disagreements.map((d) => (
                  <div key={`${d.claimId}-${d.dimensionKey}`} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-400">
                        gap {d.gap}
                      </span>
                      <span className="font-semibold">{dimensionLabel(d.dimensionKey)}</span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {DIMENSION_KIND_LABELS[d.dimensionKind] ?? d.dimensionKind}
                      </span>
                    </div>
                    <a
                      href={`/review/prophecy/claims/${d.claimId}/`}
                      className="mt-2 block text-sm hover:underline"
                    >
                      {truncate(d.claimText, 160)}
                    </a>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {d.scores.map((s) => (
                        <div
                          key={s.reviewerSlug}
                          className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <code className="text-slate-500 dark:text-slate-400">
                              {s.reviewerSlug}
                            </code>
                            <span className="font-bold tabular-nums">{s.score}/5</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                            {s.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

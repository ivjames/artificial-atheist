export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  DIMENSION_KIND_LABELS,
  dimensionLabel,
  evaluationDisagreements,
} from "@/lib/prophecy/evaluations";
import { PageHead, StatusBadge, requireProphecyPageAuth, scoreLabel, truncate } from "../shared";

// Prophecy admin — evaluation disagreement queue.
//
// The whole reason for running more than one rating pass is that two
// independent raters will diverge somewhere, and the divergence is worth more
// than either number on its own. This page does exactly one job: put the
// widest splits in front of a human, with both rationales side by side, and a
// link straight to the claim. Agreement is invisible here on purpose.
//
// Read-only. Promoting/rejecting an evaluation is not wired up yet — a human
// edits status on the claim, and machine rows stay "draft" until they do.

// A small labelled number tile (mirrors the dashboard's Stat).
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

export default async function ProphecyEvaluationsPage() {
  await requireProphecyPageAuth();

  const [total, byTarget, byDimension, byStatus, disagreements] = await Promise.all([
    prisma.prophecyEvaluation.count({ where: { targetType: "claim" } }),
    // groupBy gives distinct coverage counts without pulling every row.
    prisma.prophecyEvaluation.groupBy({
      by: ["targetId"],
      where: { targetType: "claim" },
      _count: { _all: true },
    }),
    prisma.prophecyEvaluation.groupBy({
      by: ["dimension"],
      where: { targetType: "claim" },
      _count: { _all: true },
    }),
    prisma.prophecyEvaluation.groupBy({
      by: ["status"],
      where: { targetType: "claim" },
      _count: { _all: true },
    }),
    evaluationDisagreements(prisma),
  ]);

  const draftCount = byStatus.find((r) => r.status === "draft")?._count._all ?? 0;

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead
        title="Evaluations — disagreement queue"
        blurb="Claim/dimension pairs where reviewers scored differently, widest gap first. This is where a human's time is worth the most."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Evaluations" value={total} hint={`${draftCount} still draft`} />
        <Stat label="Claims covered" value={byTarget.length} />
        <Stat label="Dimensions covered" value={byDimension.length} />
        <Stat label="Disagreements" value={disagreements.length} hint="gap ≥ 2" />
      </div>

      {total === 0 ? (
        <div className="card p-6 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold">No evaluations stored yet.</p>
          <p className="mt-2">
            Evaluations load from drafts files — <code>data/prophecy/evaluations-*.json</code> — on
            the droplet, where the database lives:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-500/10 p-3 text-xs">
            npm run prophecy:evals
          </pre>
          <p className="mt-3">
            Each file carries mandatory provenance (model, prompt version, generation time, and a
            pass identifier) and is attributed to its own automated reviewer, never to you. Loading
            is idempotent: existing scores are skipped, never overwritten. Run two passes and the
            splits between them show up here.
          </p>
        </div>
      ) : disagreements.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-semibold">No disagreements at gap ≥ 2.</p>
          <p className="mt-2">
            Either only one reviewer has scored these claims, or the reviewers are within one point
            of each other everywhere. A second independent pass is what makes this page useful.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {disagreements.map((d) => (
            <div key={`${d.claimId}:${d.dimensionKey}`} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-700 dark:text-amber-400">
                  gap {d.gap}
                </span>
                <span className="rounded-full bg-slate-500/10 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
                  {DIMENSION_KIND_LABELS[d.dimensionKind] ?? d.dimensionKind.replace(/_/g, " ")}
                </span>
                <span className="font-semibold">{dimensionLabel(d.dimensionKey)}</span>
                <a
                  href={`/review/prophecy/claims/${d.claimId}/`}
                  className="ml-auto font-semibold text-brand-600 hover:underline"
                >
                  {d.claimSlug} →
                </a>
              </div>

              <p className="mt-2 text-sm">{truncate(d.claimText, 240)}</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {d.scores.map((s, i) => (
                  <div
                    key={`${s.reviewerSlug}:${i}`}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
                        {s.score}/5 · {scoreLabel(s.score).replace(/_/g, " ")}
                      </span>
                      <code className="text-slate-500 dark:text-slate-400">{s.reviewerSlug}</code>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{s.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="card p-5 text-xs text-slate-500 dark:text-slate-400">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Status breakdown</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {byStatus.length === 0 ? (
            <span>Nothing yet.</span>
          ) : (
            byStatus
              .slice()
              .sort((a, b) => b._count._all - a._count._all)
              .map((r) => (
                <span key={r.status} className="flex items-center gap-1.5">
                  <StatusBadge status={r.status} />
                  <span className="font-semibold tabular-nums">{r._count._all}</span>
                </span>
              ))
          )}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { adminToken, isAdminAuthed } from "../pipeline/auth";
import {
  listRuns,
  aggregateStats,
  runCostAvailable,
  runCostBoundUsd,
  runCostUsd,
  type ParsedRun,
} from "@/lib/adversaryRuns";
import { loginWithToken, logoutAdmin, deleteRun, clearAllRuns } from "./actions";

function fmtDate(d: Date): string {
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

// Sub-dollar amounts need cents-of-a-cent to be legible; larger totals don't.
function fmtUsd(n: number): string {
  return "$" + (n < 1 ? n.toFixed(4) : n.toFixed(2));
}

// A cost known only to lie within a bracket. Rendered as a range so it reads as
// what it is — bounds, not a point estimate — and collapses to one figure when
// both models happen to price the same.
function fmtUsdRange(min: number, max: number): string {
  return min === max ? fmtUsd(min) : `${fmtUsd(min)}–${fmtUsd(max)}`;
}

// A small labelled number tile for the stats strip.
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

function RunCard({ run }: { run: ParsedRun }) {
  const m = run.metrics;
  // Backfilled runs kept their token totals but not the per-speaker split that
  // exact costing needs. The totals plus both models' rates still bracket the
  // real figure, so they show that bracket rather than a $0.00 that would read
  // as "this run was free".
  const costed = runCostAvailable(run);
  const bound = costed ? null : runCostBoundUsd(run);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand-600/10 px-2.5 py-1 font-semibold text-brand-600">
          {run.persona}
        </span>
        <span className="text-slate-600 dark:text-slate-300">{run.label}</span>
        <span className="text-slate-400 dark:text-slate-500">
          · soph {run.sophistication} · {run.verbosity} · {run.hostility} · {run.focus}
        </span>
        <span className="text-slate-400 dark:text-slate-500">· {run.tier}</span>
        <span className="ml-auto text-slate-400 dark:text-slate-500">{fmtDate(run.createdAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        <span>{run.turns} rounds</span>
        <span>{run.inputTokens} in / {run.outputTokens} out tok</span>
        {costed || !bound ? (
          <span className="font-medium">{fmtUsd(runCostUsd(run))}</span>
        ) : (
          <span
            className="font-medium text-slate-500 dark:text-slate-400"
            title="Backfilled from a transcript, which stored the token totals but not which side spent them. Pricing each direction at the cheaper of the two models gives the floor, the dearer one the ceiling — the real cost is inside this range."
          >
            {fmtUsdRange(bound.min, bound.max)} <span className="font-normal">· backfilled</span>
          </span>
        )}
        <span>~{m.agentAvgWords} words/reply</span>
        <span className={m.hookViolations ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
          {m.hookViolations} engagement-hook{m.hookViolations === 1 ? "" : "s"}
        </span>
        <span className={m.multiQuestionTurns ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
          {m.multiQuestionTurns} stacked-question
        </span>
        <span>{m.trailingQuestions} end on a question</span>
        <span className="text-slate-400 dark:text-slate-500">{run.adversaryModel}</span>
      </div>

      {run.seed ? (
        <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">seed: {run.seed}</p>
      ) : null}

      <details className="group mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:underline">
          Read transcript ({run.transcript.length} messages)
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {run.transcript.map((line, i) => (
            <div
              key={i}
              className={
                line.speaker === "adversary"
                  ? "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                  : "rounded-xl border border-brand-600/30 bg-brand-600/5 p-3"
              }
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {line.speaker === "adversary" ? `Apologist (${run.persona})` : "Debate agent"}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{line.content}</p>
            </div>
          ))}
        </div>
      </details>

      <form action={deleteRun.bind(null, run.id)} className="mt-3">
        <button type="submit" className="btn-ghost px-3 py-1 text-xs">
          Delete run
        </button>
      </form>
    </div>
  );
}

export default async function AdversaryReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Independent of CHAT_ENABLED — this is an operator tool, not a live surface.
  if (!adminToken()) notFound();

  const { error } = await searchParams;
  const authed = await isAdminAuthed();

  if (!authed) {
    return (
      <div className="card mx-auto mt-10 max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter the admin token to review adversarial eval runs.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            Wrong token.
          </p>
        ) : null}
        <form action={loginWithToken} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            name="token"
            required
            placeholder="Admin token"
            className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
          />
          <button type="submit" className="btn-primary py-2.5">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const runs = await listRuns();
  const stats = aggregateStats(runs);

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Adversary eval — review</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Transcripts and stats from <code>npm run adversary</code> — the simulated apologist
            vs. the real debate agent. The flagged counts below track the debate persona&apos;s own
            rules: it should never end a reply by soliciting more engagement, and never stack
            questions at the visitor in its closing. Rhetorical questions woven into the
            argument (e.g. Euthyphro) are allowed and are not counted.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
            Sign out
          </button>
        </form>
      </div>

      {runs.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
          No eval runs yet. On the droplet run e.g.{" "}
          <code>npm run adversary -- --persona all --turns 4</code> and refresh.
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold">Across {stats.runs} run{stats.runs === 1 ? "" : "s"}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Agent replies" value={stats.agentTurns} />
              <Stat label="Avg words / reply" value={stats.avgAgentWords} />
              <Stat
                label="Engagement hooks"
                value={stats.hookViolations}
                hint="should be 0"
              />
              <Stat
                label="Stacked-question replies"
                value={stats.multiQuestionTurns}
                hint="≤1 closing question; rhetoricals OK"
              />
              <Stat label="Replies ending on a ?" value={stats.trailingQuestions} />
              <Stat label="Input tokens" value={stats.inputTokens.toLocaleString()} />
              <Stat label="Output tokens" value={stats.outputTokens.toLocaleString()} />
              <Stat
                label="Total cost"
                value={
                  stats.costUnavailableRuns > 0
                    ? fmtUsdRange(stats.costMinUsd, stats.costMaxUsd)
                    : fmtUsd(stats.costUsd)
                }
                hint={
                  stats.costUnavailableRuns > 0
                    ? `list prices · range because ${stats.costUnavailableRuns} backfilled run${stats.costUnavailableRuns === 1 ? "" : "s"} lost the per-side split; ${fmtUsd(stats.costUsd)} is exact`
                    : "provider list prices"
                }
              />
            </div>

            {stats.byPersona.length > 1 ? (
              <div className="mt-4 overflow-x-auto">
                {/* One row per persona, not per run — the Runs column counts
                    that persona's own runs and sums to the total above. */}
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                  Broken out by persona — each row&apos;s <em>Runs</em> counts only that persona,
                  and the {stats.byPersona.length} rows sum to the {stats.runs} runs above. Every
                  individual run is listed below.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Persona</th>
                      <th className="py-2 pr-4 text-right">Runs</th>
                      <th className="py-2 pr-4 text-right">Replies</th>
                      <th className="py-2 pr-4 text-right">Avg words</th>
                      <th className="py-2 pr-4 text-right">Hooks</th>
                      <th className="py-2 text-right">Stacked-Q</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byPersona.map((p) => (
                      <tr key={p.persona} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="py-2 pr-4 font-medium">{p.persona}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.runs}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.agentTurns}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">{p.avgAgentWords}</td>
                        <td className={"py-2 pr-4 text-right tabular-nums " + (p.hookViolations ? "font-semibold text-amber-600 dark:text-amber-400" : "")}>
                          {p.hookViolations}
                        </td>
                        <td className={"py-2 text-right tabular-nums " + (p.multiQuestionTurns ? "font-semibold text-amber-600 dark:text-amber-400" : "")}>
                          {p.multiQuestionTurns}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Runs ({runs.length})</h2>
              <form action={clearAllRuns}>
                <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
                  Clear all
                </button>
              </form>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {runs.map((r) => (
                <RunCard key={r.id} run={r} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

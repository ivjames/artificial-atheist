export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { adminToken, isAdminAuthed } from "../../pipeline/auth";
import { getReport, type QaFinding, type QaFindingGroup } from "@/lib/qaReports";
import { deleteReport } from "../actions";
import { SeverityBadge, SeverityCounts, fmtDate } from "../ui";

// One saved QA scan, rendered readably: the flat findings list (one row per
// page × issue) collapsed into distinct issues with their affected pages.

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

// The short, per-page slice of evidence worth showing inline. Full evidence
// stays available as pretty-printed JSON in a <details>.
function evidenceSummary(f: QaFinding): string | null {
  const ev = f.evidence as Record<string, unknown> | undefined;
  if (!ev || typeof ev !== "object") return null;
  if (typeof ev.displayValue === "string") return ev.displayValue;
  if (typeof ev.score === "number") return `score ${ev.score}`;
  if (typeof ev.value === "string") return ev.value;
  if (typeof ev.node_count === "number") {
    return `${ev.node_count} element${ev.node_count === 1 ? "" : "s"}`;
  }
  return null;
}

function GroupCard({ group }: { group: QaFindingGroup }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={group.severity} />
        <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
          {group.pipeline}
        </span>
        <code className="text-xs text-slate-400 dark:text-slate-500">{group.rule}</code>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {group.occurrences.length} page{group.occurrences.length === 1 ? "" : "s"}
        </span>
      </div>
      <h3 className="mt-2 font-semibold">{group.title}</h3>
      {group.detail ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{group.detail}</p>
      ) : null}

      <details className="group mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:underline">
          Affected pages
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {group.occurrences.map((f, i) => {
            const summary = evidenceSummary(f);
            return (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-xs text-brand-600 hover:underline"
                >
                  {pathOf(f.url)}
                </a>
                {f.severity !== group.severity ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{f.severity}</span>
                ) : null}
                {summary ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{summary}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-400 hover:underline dark:text-slate-500">
            Raw evidence (JSON)
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
            {JSON.stringify(
              group.occurrences.map((f) => ({ url: f.url, severity: f.severity, title: f.title, evidence: f.evidence })),
              null,
              2,
            )}
          </pre>
        </details>
      </details>
    </div>
  );
}

export default async function QaReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!adminToken()) notFound();
  if (!(await isAdminAuthed())) notFound();

  const { id } = await params;
  const { saved } = await searchParams;
  const report = await getReport(id);
  if (!report) notFound();

  const { row, groups, stats } = report;
  const durationSecs =
    typeof stats.duration_secs === "number" ? Math.round(stats.duration_secs) : null;

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/review/qa/" className="text-sm text-brand-600 hover:underline">
          ← All QA reports
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{row.target || "QA report"}</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              exported {fmtDate(row.exportedAt)} · saved {fmtDate(row.createdAt)} · run{" "}
              <code>{row.runId}</code> · {row.pages} page{row.pages === 1 ? "" : "s"}
              {durationSecs !== null ? ` · ${durationSecs}s scan` : ""} · status {row.status}
            </p>
          </div>
          <form
            action={deleteReport.bind(null, row.id)}
            className="shrink-0"
          >
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
              Delete report
            </button>
          </form>
        </div>
        {saved ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Report {saved === "updated" ? "updated (same run id re-uploaded)" : "saved"}.
          </p>
        ) : null}
        <div className="mt-3">
          <SeverityCounts
            serious={row.serious}
            moderate={row.moderate}
            minor={row.minor}
            info={row.info}
          />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold">
          {groups.length} distinct issue{groups.length === 1 ? "" : "s"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Grouped by rule across all scanned pages, worst severity first. The raw export is
          stored verbatim — expand a group for per-page evidence.
        </p>
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((g) => (
            <GroupCard key={`${g.pipeline}-${g.rule}`} group={g} />
          ))}
        </div>
      </section>
    </div>
  );
}

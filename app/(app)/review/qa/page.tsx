export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { adminToken, isAdminAuthed } from "../pipeline/auth";
import { listReports } from "@/lib/qaReports";
import { loginWithToken, logoutAdmin, uploadReport } from "./actions";
import { SeverityCounts, fmtDate } from "./ui";

// QA report archive: upload the JSON a QA scan exports and it's stored in the
// DB and rendered readably — so scans survive wherever the original file went
// and stay comparable over time.
export default async function QaReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!adminToken()) notFound();

  const { error } = await searchParams;
  const authed = await isAdminAuthed();

  if (!authed) {
    return (
      <div className="card mx-auto mt-10 max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter the admin token to review QA scan reports.
        </p>
        {error === "auth" ? (
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

  const reports = await listReports();

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QA reports</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Archive of QA scan exports. Upload the JSON file a scan produces (or paste its
            contents) and it&apos;s stored here permanently — findings grouped into distinct
            issues instead of one row per page. Re-uploading the same scan (same run id)
            refreshes it rather than duplicating it.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
            Sign out
          </button>
        </form>
      </div>

      {error && error !== "auth" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="card p-5">
        <h2 className="text-lg font-bold">Add a report</h2>
        <form action={uploadReport} className="mt-3 flex flex-col gap-3">
          <label className="text-sm font-medium">
            Export file (.json)
            <input
              type="file"
              name="file"
              accept=".json,application/json"
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-600 dark:text-slate-300"
            />
          </label>
          <div className="text-center text-xs uppercase tracking-wide text-slate-400">
            or paste the JSON
          </div>
          <textarea
            name="json"
            rows={4}
            placeholder='{"exported_at": "...", "run_id": "...", "findings": [...]}'
            className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
          />
          <button type="submit" className="btn-primary self-start px-5 py-2">
            Save report
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold">
          Saved reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Nothing saved yet — upload your first scan above.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/review/qa/${r.id}/`}
                className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4 hover:border-brand-400"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.target || r.runId}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(r.exportedAt ?? r.createdAt)} · {r.pages} page{r.pages === 1 ? "" : "s"} ·
                    run <code>{r.runId.slice(0, 8)}</code>
                  </div>
                </div>
                <div className="ml-auto">
                  <SeverityCounts
                    serious={r.serious}
                    moderate={r.moderate}
                    minor={r.minor}
                    info={r.info}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { adminToken, isAdminAuthed } from "../pipeline/auth";
import { loginWithToken, logoutAdmin } from "./actions";
import { ErrorBanner, qp } from "./shared";

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

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nothing yet.</p>
      ) : (
        <dl className="mt-2 flex flex-col gap-1">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-slate-600 dark:text-slate-300">{r.key.replace(/_/g, " ")}</dt>
              <dd className="font-semibold tabular-nums">{r.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const LINKS: Array<{ href: string; title: string; blurb: string }> = [
  {
    href: "/review/prophecy/sources/",
    title: "Sources",
    blurb: "Bibliographic sources — books, articles, primary texts.",
  },
  {
    href: "/review/prophecy/lists/",
    title: "Source lists & import",
    blurb: "Published prophecy lists, CSV/JSON import, entry→claim mapping.",
  },
  {
    href: "/review/prophecy/claims/",
    title: "Claims",
    blurb: "Normalized claims — search, create, moderate, merge.",
  },
  {
    href: "/review/prophecy/export/",
    title: "Export JSON",
    blurb: "Download the claims corpus as JSON.",
  },
  {
    href: "/review/prophecy/export/?format=csv",
    title: "Export CSV",
    blurb: "Download the claims corpus as CSV.",
  },
];

export default async function ProphecyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Operator tool — independent of CHAT_ENABLED, but no token = no surface.
  if (!adminToken()) notFound();

  const sp = await searchParams;
  const error = qp(sp.error);
  const authed = await isAdminAuthed();

  if (!authed) {
    return (
      <div className="card mx-auto mt-10 max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter the admin token to reach the prophecy analysis admin.
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

  const [claimsByStatus, claimCount, listCount, entriesByMapping, entryCount, evalCount, sourceCount] =
    await Promise.all([
      prisma.prophecyClaim.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.prophecyClaim.count(),
      prisma.prophecySourceList.count(),
      prisma.prophecySourceListEntry.groupBy({ by: ["mappingStatus"], _count: { _all: true } }),
      prisma.prophecySourceListEntry.count(),
      prisma.prophecyEvaluation.count(),
      prisma.prophecySource.count(),
    ]);

  const statusRows = claimsByStatus
    .map((r) => ({ key: r.status, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  const mappingRows = entriesByMapping
    .map((r) => ({ key: r.mappingStatus, count: r._count._all }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prophecy analysis — admin</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Source lists preserved verbatim, normalized claims, entry→claim mapping, moderation,
            and corpus export. Nothing here publishes to the site.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
            Sign out
          </button>
        </form>
      </div>

      {error ? <ErrorBanner code={error} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Claims" value={claimCount} />
        <Stat label="Source lists" value={listCount} />
        <Stat label="List entries" value={entryCount} />
        <Stat label="Evaluations" value={evalCount} />
        <Stat label="Sources" value={sourceCount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BreakdownCard title="Claims by status" rows={statusRows} />
        <BreakdownCard title="Entries by mapping status" rows={mappingRows} />
      </div>

      <section>
        <h2 className="text-lg font-bold">Work areas</h2>
        <div className="mt-3 flex flex-col gap-3">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand-400"
            >
              <div>
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{l.blurb}</p>
              </div>
              <span className="text-sm font-semibold text-brand-600">→</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

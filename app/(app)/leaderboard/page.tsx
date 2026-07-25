import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const results = await prisma.result.findMany({
    where: { displayName: { not: null }, total: { gt: 0 } },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 25,
  });

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display mb-1 text-3xl font-medium tracking-tight">Leaderboard</h1>
      <p className="mb-6 text-slate-500 dark:text-slate-400">Top results from recent players.</p>

      {results.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500">No entries yet.</p>
          <Link href="/" className="btn-primary mt-4">
            Be the first →
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {results.map((r, i) => {
            const pct = Math.round((r.score / r.total) * 100);
            return (
              <Link
                key={r.id}
                href={`/result/${r.slug}`}
                className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span
                  className={
                    "w-7 text-center text-sm font-bold " +
                    (i < 3 ? "text-brand-600 dark:text-brand-300" : "text-slate-400")
                  }
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-semibold">{r.displayName}</span>
                {r.category ? (
                  <span className="hidden text-xs text-slate-400 sm:inline">{r.category}</span>
                ) : null}
                <span className="tabular-nums font-bold">
                  {r.score}/{r.total}
                </span>
                <span className="w-12 text-right text-sm text-slate-400">{pct}%</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

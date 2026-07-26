export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSourceList } from "@/lib/prophecy/public";
import { Label, MatchBadge, Muted } from "../../shared";

// The list description carries the retrieval URL (set at import time). Pull the
// first http(s) URL out of it for an out-link rather than storing it twice.
function firstUrl(text: string): string {
  return /(https?:\/\/[^\s)]+)/.exec(text)?.[1] ?? "";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getSourceList(prisma, slug);
  return { title: list ? `${list.title} — source list` : "Source list not found" };
}

export default async function PublicListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getSourceList(prisma, slug);
  if (!list) notFound();

  const url = list.sourceUrl || firstUrl(list.description);
  const mismatch = list.claimedCount != null && list.claimedCount !== list.entries.length;
  const mapped = list.entries.filter((e) => e.claims.length > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/prophecy/lists/" className="text-sm text-brand-600 hover:underline">
          ← All source lists
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{list.title}</h1>
        {list.description ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{list.description}</p>
        ) : null}
        {url ? (
          <p className="mt-2 text-sm">
            <a
              href={url}
              rel="nofollow noopener external"
              target="_blank"
              className="text-brand-600 hover:underline"
            >
              Original source ↗
            </a>
          </p>
        ) : null}
      </div>

      <div className="card p-5">
        <Label>Counts</Label>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {list.claimedCount != null ? (
            <span>
              Claimed by the source: <strong>{list.claimedCount}</strong>
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              The source states no total.
            </span>
          )}
          <span>
            Entries actually present: <strong>{list.entries.length}</strong>
          </span>
          <Muted>{mapped} mapped to a published claim</Muted>
        </div>
        {mismatch ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            The advertised total and the number of entries on the page do not match. Both are
            recorded as found; neither is corrected.
          </p>
        ) : null}
      </div>

      <section>
        <h2 className="text-lg font-bold">Entries</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Verbatim, in the source&rsquo;s own order and numbering.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {list.entries.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {e.entryNumber}
                </span>
                <p className="flex-1 text-sm italic">&ldquo;{e.originalWording}&rdquo;</p>
              </div>
              {e.claims.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  {e.claims.map((c) => (
                    <div key={c.slug} className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/prophecy/claims/${c.slug}/`}
                        className="text-sm text-brand-600 hover:underline"
                      >
                        {c.text}
                      </Link>
                      <MatchBadge matchType={c.matchType} confidence={c.confidence} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Not yet reviewed
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

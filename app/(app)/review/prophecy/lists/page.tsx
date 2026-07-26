export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  ErrorBanner,
  INPUT_CLS,
  LABEL_CLS,
  PageHead,
  qp,
  requireProphecyPageAuth,
} from "../shared";
import { createList } from "./actions";

export default async function ProphecyListsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProphecyPageAuth();
  const sp = await searchParams;
  const error = qp(sp.error);

  const [lists, sources] = await Promise.all([
    prisma.prophecySourceList.findMany({
      orderBy: { createdAt: "desc" },
      include: { source: true, _count: { select: { entries: true } } },
    }),
    prisma.prophecySource.findMany({ orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead
        title="Source lists"
        blurb="Published/circulated prophecy lists, preserved verbatim. claimedCount is the list's OWN advertised total — provenance metadata, never a finding of ours."
      />

      {error ? <ErrorBanner code={error} /> : null}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Add a source list</h2>
        <form action={createList} className="mt-4 flex flex-col gap-3">
          <label className={LABEL_CLS}>
            Title (required)
            <input name="title" required className={INPUT_CLS} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLS}>
              Bibliographic source (optional)
              <select name="sourceId" defaultValue="" className={INPUT_CLS}>
                <option value="">— none —</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.year != null ? ` (${s.year})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLS}>
              Claimed count (optional)
              <input
                name="claimedCount"
                inputMode="numeric"
                placeholder="e.g. 324"
                className={INPUT_CLS}
              />
            </label>
          </div>
          <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
            Create list
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold">All lists ({lists.length})</h2>
        <div className="mt-3 flex flex-col gap-3">
          {lists.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No source lists yet.</p>
          ) : (
            lists.map((l) => (
              <a
                key={l.id}
                href={`/review/prophecy/lists/${l.id}/`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-brand-400"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{l.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <code>{l.slug}</code>
                    {l.source ? ` · ${l.source.title}` : ""}
                    {l.claimedCount != null ? ` · claims ${l.claimedCount} items` : ""}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {l._count.entries} entr{l._count.entries === 1 ? "y" : "ies"} →
                </span>
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

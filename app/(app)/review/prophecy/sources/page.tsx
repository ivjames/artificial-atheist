export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  ErrorBanner,
  INPUT_CLS,
  LABEL_CLS,
  NoticeBanner,
  PageHead,
  SOURCE_TYPE_TERMS,
  qp,
  requireProphecyPageAuth,
} from "../shared";
import { createSource } from "./actions";

export default async function ProphecySourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProphecyPageAuth();
  const sp = await searchParams;
  const error = qp(sp.error);
  const created = qp(sp.created);

  const sources = await prisma.prophecySource.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead
        title="Sources"
        blurb="Bibliographic / documentary provenance reused by quotations, source lists, evidence, and citations."
      />

      {error ? <ErrorBanner code={error} /> : null}
      {created ? (
        <NoticeBanner>
          Created source <code>{created}</code>.
        </NoticeBanner>
      ) : null}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Add a source</h2>
        <form action={createSource} className="mt-4 flex flex-col gap-3">
          <label className={LABEL_CLS}>
            Title (required)
            <input name="title" required className={INPUT_CLS} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLS}>
              Type
              <select name="type" defaultValue="book" className={INPUT_CLS}>
                {SOURCE_TYPE_TERMS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLS}>
              Year (optional)
              <input name="year" inputMode="numeric" placeholder="e.g. 1993" className={INPUT_CLS} />
            </label>
          </div>
          <label className={LABEL_CLS}>
            Author (optional)
            <input name="author" className={INPUT_CLS} />
          </label>
          <label className={LABEL_CLS}>
            URL (optional)
            <input name="url" placeholder="https://…" className={INPUT_CLS} />
          </label>
          <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
            Create source
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold">All sources ({sources.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {sources.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No sources yet.</p>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.title}
                    {s.year != null ? (
                      <span className="text-slate-500 dark:text-slate-400"> ({s.year})</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <code>{s.slug}</code> · {s.type.replace(/_/g, " ")}
                    {s.author ? ` · ${s.author}` : ""}
                  </p>
                </div>
                {s.url ? (
                  <a
                    href={s.url}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                    rel="noreferrer"
                    target="_blank"
                  >
                    link ↗
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MATCH_TYPES } from "@/lib/prophecy/vocab";
import {
  ErrorBanner,
  INPUT_CLS,
  LABEL_CLS,
  MappingBadge,
  NoticeBanner,
  PageHead,
  qp,
  requireProphecyPageAuth,
  scoreLabel,
  truncate,
} from "../../shared";
import { importIntoList, mapEntry } from "../actions";

const MAPPING_FILTERS = ["unmapped", "mapped", "disputed"] as const;

export default async function ProphecyListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProphecyPageAuth();
  const { id } = await params;
  const sp = await searchParams;

  const error = qp(sp.error);
  const detail = qp(sp.detail);
  const mapped = qp(sp.mapped);
  const createdBanner = qp(sp.created);
  const skipped = qp(sp.skipped);
  const importErrors = qp(sp.errors);
  const errdetail = qp(sp.errdetail);
  const statusFilterRaw = qp(sp.status);
  const statusFilter = (MAPPING_FILTERS as readonly string[]).includes(statusFilterRaw)
    ? statusFilterRaw
    : "";

  const list = await prisma.prophecySourceList.findUnique({
    where: { id },
    include: { source: true, _count: { select: { entries: true, batches: true } } },
  });
  if (!list) notFound();

  const entries = await prisma.prophecySourceListEntry.findMany({
    where: { sourceListId: list.id, ...(statusFilter ? { mappingStatus: statusFilter } : {}) },
    orderBy: { createdAt: "asc" },
    include: { claimMaps: { include: { claim: true } } },
  });

  const self = `/review/prophecy/lists/${list.id}/`;
  // "created" doubles as the just-created-list flag (=1) and the import count.
  const importDone = createdBanner !== "" && (skipped !== "" || importErrors !== "");

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead title={list.title} />

      <div className="card p-5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          List metadata
        </p>
        <p className="mt-2">
          <code>{list.slug}</code>
          {list.source ? ` · source: ${list.source.title}` : " · no bibliographic source"}
          {list.claimedCount != null ? ` · advertises ${list.claimedCount} items` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {list._count.entries} imported entr{list._count.entries === 1 ? "y" : "ies"} across{" "}
          {list._count.batches} import batch{list._count.batches === 1 ? "" : "es"}.
          {" "}
          <a href="/review/prophecy/lists/" className="font-semibold text-brand-600 hover:underline">
            ← all lists
          </a>
        </p>
        {list.description ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">{list.description}</p>
        ) : null}
      </div>

      {error ? <ErrorBanner code={error} detail={detail} /> : null}
      {createdBanner === "1" && !importDone ? <NoticeBanner>List created.</NoticeBanner> : null}
      {importDone ? (
        <NoticeBanner>
          Import finished: {createdBanner} created, {skipped} skipped, {importErrors} error
          {importErrors === "1" ? "" : "s"}.
          {errdetail ? <span className="block mt-1 text-xs opacity-80">{errdetail}</span> : null}
        </NoticeBanner>
      ) : null}
      {mapped ? (
        <NoticeBanner>
          Entry {mapped} mapped to claim.
        </NoticeBanner>
      ) : null}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Import entries</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Paste the list's CSV or JSON. Re-importing the same entry numbers skips them — imports
          are idempotent per list.
        </p>
        <form action={importIntoList} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="listId" value={list.id} />
          <label className={LABEL_CLS}>
            Content (CSV or JSON)
            <textarea name="text" required rows={8} className={INPUT_CLS} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLS}>
              Format
              <select name="format" defaultValue="csv" className={INPUT_CLS}>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </label>
            <label className={LABEL_CLS}>
              Filename (optional, for the audit trail)
              <input name="filename" placeholder="e.g. 324-prophecies.csv" className={INPUT_CLS} />
            </label>
          </div>
          <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
            Run import
          </button>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Entries ({entries.length})</h2>
          <div className="flex gap-1 text-xs">
            <a
              href={self}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                statusFilter === ""
                  ? "bg-brand-600/10 text-brand-600"
                  : "text-slate-500 hover:underline dark:text-slate-400"
              }`}
            >
              all
            </a>
            {MAPPING_FILTERS.map((f) => (
              <a
                key={f}
                href={`${self}?status=${f}`}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  statusFilter === f
                    ? "bg-brand-600/10 text-brand-600"
                    : "text-slate-500 hover:underline dark:text-slate-400"
                }`}
              >
                {f}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {statusFilter ? `No ${statusFilter} entries.` : "No entries imported yet."}
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-500/10 px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-300">
                    #{e.entryNumber}
                  </span>
                  <MappingBadge status={e.mappingStatus} />
                  {e.parseStatus !== "ok" ? (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-700 dark:text-red-400">
                      parse {e.parseStatus}
                    </span>
                  ) : null}
                  {e.originalPassageRefs ? (
                    <span className="text-slate-500 dark:text-slate-400">{e.originalPassageRefs}</span>
                  ) : null}
                </div>

                <p className="mt-2 text-sm">{truncate(e.originalWording, 220)}</p>

                {e.claimMaps.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-1">
                    {e.claimMaps.map((m) => (
                      <p key={m.id} className="text-xs text-slate-600 dark:text-slate-300">
                        →{" "}
                        <a
                          href={`/review/prophecy/claims/${m.claimId}/`}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          {m.claim.slug}
                        </a>{" "}
                        · {m.matchType.replace(/_/g, " ")} · confidence {m.confidence} (
                        {scoreLabel(m.confidence)})
                        {m.rationale ? ` · ${truncate(m.rationale, 100)}` : ""}
                      </p>
                    ))}
                  </div>
                ) : null}

                <form
                  action={mapEntry}
                  className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800"
                >
                  <input type="hidden" name="listId" value={list.id} />
                  <input type="hidden" name="entryId" value={e.id} />
                  <label className={`${LABEL_CLS} min-w-40 flex-1`}>
                    Map to claim (slug or id)
                    <input name="claimRef" required className={INPUT_CLS} />
                  </label>
                  <label className={LABEL_CLS}>
                    Match
                    <select name="matchType" defaultValue="exact" className={INPUT_CLS}>
                      {MATCH_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={LABEL_CLS}>
                    Confidence
                    <select name="confidence" defaultValue="3" className={INPUT_CLS}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} — {scoreLabel(n).replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`${LABEL_CLS} min-w-40 flex-1`}>
                    Rationale (optional)
                    <input name="rationale" className={INPUT_CLS} />
                  </label>
                  <button type="submit" className="btn-ghost px-3 py-2 text-xs">
                    Map
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { MODERATION_STATES } from "@/lib/prophecy/vocab";
import { countClaims, searchClaims } from "@/lib/prophecy/claims";
import {
  CATEGORY_TERMS,
  ErrorBanner,
  INPUT_CLS,
  LABEL_CLS,
  NoticeBanner,
  PageHead,
  StatusBadge,
  SUBJECT_TERMS,
  qp,
  requireProphecyPageAuth,
  truncate,
} from "../shared";
import { createClaimAction } from "./actions";

// The minimal claim shape this page reads — searchClaims returns at least the
// scalar ProphecyClaim columns.
type ClaimRow = { id: string; slug: string; text: string; summary: string; status: string };

export default async function ProphecyClaimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProphecyPageAuth();
  const sp = await searchParams;

  const error = qp(sp.error);
  const detail = qp(sp.detail);
  const created = qp(sp.created);
  const q = qp(sp.q).trim();
  const statusRaw = qp(sp.status);
  const status = (MODERATION_STATES as readonly string[]).includes(statusRaw) ? statusRaw : "";
  const categoryRaw = qp(sp.category);
  const category = CATEGORY_TERMS.some((t) => t.key === categoryRaw) ? categoryRaw : "";

  // Paginated: the corpus runs to hundreds of claims after a draft load, so an
  // unpaged cap silently hid everything past the first screenful.
  const PER_PAGE = 50;
  const pageRaw = Number.parseInt(qp(sp.page) || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const filters = {
    q: q || undefined,
    status: status || undefined,
    categoryKey: category || undefined,
  };

  const [results, total] = (await Promise.all([
    searchClaims(prisma, { ...filters, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    countClaims(prisma, filters),
  ])) as unknown as [ClaimRow[], number];

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `/review/prophecy/claims/${qs ? `?${qs}` : ""}`;
  };

  // Mapped-entry counts, independent of whatever searchClaims includes.
  const ids = results.map((c) => c.id);
  const mapCounts = ids.length
    ? await prisma.prophecyClaimEntryMap.groupBy({
        by: ["claimId"],
        where: { claimId: { in: ids } },
        _count: { _all: true },
      })
    : [];
  const countByClaim = new Map(mapCounts.map((m) => [m.claimId, m._count._all]));

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead
        title="Claims"
        blurb="Normalized, neutrally-worded propositions. Search, create, moderate on the detail page."
      />

      {error ? <ErrorBanner code={error} detail={detail} /> : null}
      {created ? <NoticeBanner>Claim created.</NoticeBanner> : null}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Search</h2>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className={`${LABEL_CLS} min-w-48 flex-1`}>
            Text
            <input name="q" defaultValue={q} placeholder="search text/slug…" className={INPUT_CLS} />
          </label>
          <label className={LABEL_CLS}>
            Status
            <select name="status" defaultValue={status} className={INPUT_CLS}>
              <option value="">any</option>
              {MODERATION_STATES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL_CLS}>
            Category
            <select name="category" defaultValue={category} className={INPUT_CLS}>
              <option value="">any</option>
              {CATEGORY_TERMS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Search
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold">
          Results ({total.toLocaleString()}
          {total > PER_PAGE
            ? ` — showing ${(page - 1) * PER_PAGE + 1}-${(page - 1) * PER_PAGE + results.length}`
            : ""}
          )
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {results.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No claims match.</p>
          ) : (
            results.map((c) => (
              <a
                key={c.id}
                href={`/review/prophecy/claims/${c.id}/`}
                className="card block p-4 hover:border-brand-400"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <code className="font-semibold">{c.slug}</code>
                  <StatusBadge status={c.status} />
                  <span className="text-slate-500 dark:text-slate-400">
                    {countByClaim.get(c.id) ?? 0} mapped entr
                    {(countByClaim.get(c.id) ?? 0) === 1 ? "y" : "ies"}
                  </span>
                </div>
                <p className="mt-2 text-sm">{truncate(c.text, 220)}</p>
                {c.summary ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {truncate(c.summary, 160)}
                  </p>
                ) : null}
              </a>
            ))
          )}
        </div>

        {lastPage > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <a href={pageHref(page - 1)} className="btn-ghost px-3 py-1.5 text-xs">
                ← Previous
              </a>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {page} of {lastPage}
            </span>
            {page < lastPage ? (
              <a href={pageHref(page + 1)} className="btn-ghost px-3 py-1.5 text-xs">
                Next →
              </a>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold">Create a claim</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Write the proposition neutrally — the text must not embed a verdict.
        </p>
        <form action={createClaimAction} className="mt-4 flex flex-col gap-3">
          <label className={LABEL_CLS}>
            Claim text (required)
            <textarea name="text" required rows={3} className={INPUT_CLS} />
          </label>
          <label className={LABEL_CLS}>
            Summary (optional)
            <input name="summary" className={INPUT_CLS} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL_CLS}>
              Categories (ctrl/cmd-click for several)
              <select name="categoryKeys" multiple size={6} className={INPUT_CLS}>
                {CATEGORY_TERMS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL_CLS}>
              Subjects (ctrl/cmd-click for several)
              <select name="subjectKeys" multiple size={6} className={INPUT_CLS}>
                {SUBJECT_TERMS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary self-start px-4 py-2 text-sm">
            Create claim
          </button>
        </form>
      </section>
    </div>
  );
}

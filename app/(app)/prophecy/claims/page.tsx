export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listPublishedClaims } from "@/lib/prophecy/public";
import {
  CATEGORY_TERMS,
  Label,
  Muted,
  PageHead,
  SUBJECT_TERMS,
  Tag,
  parseKeys,
  qs,
  selectClass,
  vocabLabel,
} from "../shared";

const PER_PAGE = 24;

export const metadata = {
  title: "Prophecy claims — index",
};

export default async function PublicClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; subject?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const category = sp.category ?? "";
  const subject = sp.subject ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const { claims, total } = await listPublishedClaims(prisma, {
    q: q || undefined,
    categoryKey: category || undefined,
    subjectKey: subject || undefined,
    take: PER_PAGE,
    skip: (page - 1) * PER_PAGE,
  });

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Claims"
        lead="Normalized propositions drawn from the source lists. Each one links back to every entry that asserts it."
      />

      <form method="get" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <Label>Search</Label>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="e.g. Bethlehem, betrayed, pierced"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <Label>Category</Label>
          <select name="category" defaultValue={category} className={selectClass}>
            <option value="">Any</option>
            {CATEGORY_TERMS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <Label>Subject</Label>
          <select name="subject" defaultValue={subject} className={selectClass}>
            <option value="">Any</option>
            {SUBJECT_TERMS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Filter
        </button>
      </form>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {total.toLocaleString()} published claim{total === 1 ? "" : "s"}
        {q || category || subject ? " matching your filters" : ""}.
      </p>

      {claims.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500 dark:text-slate-400">
          Nothing to show yet. Claims appear here once editorial review publishes them — the
          verbatim <Link href="/prophecy/lists/" className="underline">source lists</Link> are
          already browsable.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {claims.map((c) => {
            const cats = parseKeys(c.categoryKeys);
            return (
              <Link key={c.id} href={`/prophecy/claims/${c.slug}/`} className="card block p-5">
                <p className="font-semibold">{c.text}</p>
                {c.summary ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.summary}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {cats.map((k) => (
                    <Tag key={k}>{vocabLabel("category", k)}</Tag>
                  ))}
                  <Muted>
                    {c.entryCount} source entr{c.entryCount === 1 ? "y" : "ies"}
                  </Muted>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {lastPage > 1 ? (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/prophecy/claims/${qs({ q, category, subject, page: page - 1 })}`}
              className="btn-ghost px-3 py-1.5"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <Muted>
            Page {page} of {lastPage}
          </Muted>
          {page < lastPage ? (
            <Link
              href={`/prophecy/claims/${qs({ q, category, subject, page: page + 1 })}`}
              className="btn-ghost px-3 py-1.5"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}

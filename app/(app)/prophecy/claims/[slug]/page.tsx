export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublishedClaim } from "@/lib/prophecy/public";
import { Label, MatchBadge, Muted, Tag, parseKeys, vocabLabel } from "../../shared";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const claim = await getPublishedClaim(prisma, slug);
  if (!claim) return { title: "Claim not found" };
  return { title: `${claim.text} — prophecy claim`, description: claim.summary || undefined };
}

export default async function PublicClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const claim = await getPublishedClaim(prisma, slug);
  if (!claim) notFound();

  const cats = parseKeys(claim.categoryKeys);
  const subs = parseKeys(claim.subjectKeys);
  // Entries grouped by source list, so a list that splits one passage across
  // several entries reads as one block rather than scattered rows.
  const byList = new Map<string, typeof claim.entryMaps>();
  for (const m of claim.entryMaps) {
    const key = m.entry.sourceList.slug;
    const bucket = byList.get(key);
    if (bucket) bucket.push(m);
    else byList.set(key, [m]);
  }
  const aiDrafted = (claim.createdBy ?? "").startsWith("ai:");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/prophecy/claims/" className="text-sm text-brand-600 hover:underline">
          ← All claims
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{claim.text}</h1>
        {claim.summary ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{claim.summary}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {cats.map((k) => (
            <Tag key={k}>{vocabLabel("category", k)}</Tag>
          ))}
          {subs.map((k) => (
            <span
              key={k}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {vocabLabel("subject", k)}
            </span>
          ))}
        </div>
      </div>

      {claim.supersededByPublished ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          This claim was merged into{" "}
          <Link
            href={`/prophecy/claims/${claim.supersededByPublished.slug}/`}
            className="font-semibold underline"
          >
            {claim.supersededByPublished.text}
          </Link>
          . Its source entries are preserved on both records.
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-bold">
          Appears in {byList.size} source list{byList.size === 1 ? "" : "s"} ·{" "}
          {claim.entryMaps.length} entr{claim.entryMaps.length === 1 ? "y" : "ies"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Each entry below is quoted exactly as its list published it, with how it was matched to
          this claim.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {[...byList.entries()].map(([listSlug, maps]) => (
            <div key={listSlug} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/prophecy/lists/${listSlug}/`}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {maps[0].entry.sourceList.title}
                </Link>
                <Muted>
                  {maps.length} entr{maps.length === 1 ? "y" : "ies"} in this list
                </Muted>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {maps.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Muted>Entry {m.entry.entryNumber}</Muted>
                      {m.entry.originalPassageRefs ? (
                        <Muted>· {m.entry.originalPassageRefs}</Muted>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm italic">&ldquo;{m.entry.originalWording}&rdquo;</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MatchBadge matchType={m.matchType} confidence={m.confidence} />
                    </div>
                    {m.rationale ? (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {m.rationale}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {claim.relationships.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold">Related claims</h2>
          <div className="mt-3 flex flex-col gap-2">
            {claim.relationships.map((r) => (
              <Link
                key={r.id}
                href={`/prophecy/claims/${r.claim.slug}/`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <span>{r.claim.text}</span>
                <Muted>
                  {r.direction === "out" ? "" : "← "}
                  {vocabLabel("relationship_type", r.type)}
                  {r.direction === "out" ? " →" : ""}
                </Muted>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {claim.supersedesPublished.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold">Merged into this claim</h2>
          <div className="mt-3 flex flex-col gap-2">
            {claim.supersedesPublished.map((c) => (
              <Link
                key={c.slug}
                href={`/prophecy/claims/${c.slug}/`}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                {c.text}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card p-5">
        <Label>Record provenance</Label>
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          <p>
            Added {claim.createdAt.toISOString().slice(0, 10)} · last updated{" "}
            {claim.updatedAt.toISOString().slice(0, 10)} · {claim.revisions.length} revision
            {claim.revisions.length === 1 ? "" : "s"}
          </p>
          <p>
            {aiDrafted
              ? "Normalized wording was AI-drafted from the source entries, then reviewed and published by an editor."
              : "Written and published by an editor."}{" "}
            The source entries above are unedited.
          </p>
        </div>
      </section>
    </div>
  );
}

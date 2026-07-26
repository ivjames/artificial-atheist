export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MODERATION_STATES } from "@/lib/prophecy/vocab";
import { DIMENSION_KIND_LABELS, claimEvaluations } from "@/lib/prophecy/evaluations";
import {
  CATEGORY_TERMS,
  ErrorBanner,
  INPUT_CLS,
  LABEL_CLS,
  NoticeBanner,
  PageHead,
  StatusBadge,
  SUBJECT_TERMS,
  fmtDate,
  parseKeyList,
  qp,
  requireProphecyPageAuth,
  scoreLabel,
  truncate,
} from "../../shared";
import { changeClaimStatus, mergeIntoClaim } from "../actions";

function keyLabels(keys: string[], terms: Array<{ key: string; label: string }>): string {
  if (keys.length === 0) return "—";
  return keys.map((k) => terms.find((t) => t.key === k)?.label ?? k).join(", ");
}

export default async function ProphecyClaimDetailPage({
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
  const merged = qp(sp.merged);
  const created = qp(sp.created);

  const claim = await prisma.prophecyClaim.findUnique({
    where: { id },
    include: {
      supersededBy: true,
      supersedes: true,
      entryMaps: {
        include: { entry: { include: { sourceList: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!claim) notFound();

  const [relationships, revisions, evaluations] = await Promise.all([
    prisma.prophecyRelationship.findMany({
      where: {
        OR: [
          { fromType: "claim", fromId: claim.id },
          { toType: "claim", toId: claim.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.prophecyRevision.findMany({
      where: { targetType: "claim", targetId: claim.id },
      orderBy: { createdAt: "desc" },
    }),
    claimEvaluations(prisma, claim.id),
  ]);

  // Group the component scores for display: kind → rows, preserving the
  // vocab ordering claimEvaluations already applied. Dimensions where the
  // reviewers landed on different numbers are flagged inline — the split is
  // the finding, and burying it would defeat running two passes at all.
  const evalGroups: Array<[string, typeof evaluations]> = [];
  const disagreedDimensions = new Set<string>();
  {
    const scoresByDimension = new Map<string, Set<number>>();
    for (const e of evaluations) {
      const seen = scoresByDimension.get(e.dimensionKey) ?? new Set<number>();
      seen.add(e.score);
      scoresByDimension.set(e.dimensionKey, seen);
      const group = evalGroups.find(([kind]) => kind === e.dimensionKind);
      if (group) group[1].push(e);
      else evalGroups.push([e.dimensionKind, [e]]);
    }
    for (const [key, seen] of scoresByDimension) {
      if (seen.size > 1) disagreedDimensions.add(key);
    }
  }

  // Resolve claim endpoints in the relationship graph to slugs for display.
  const relClaimIds = new Set<string>();
  for (const r of relationships) {
    if (r.fromType === "claim") relClaimIds.add(r.fromId);
    if (r.toType === "claim") relClaimIds.add(r.toId);
  }
  relClaimIds.delete(claim.id);
  const relClaims = relClaimIds.size
    ? await prisma.prophecyClaim.findMany({
        where: { id: { in: [...relClaimIds] } },
        select: { id: true, slug: true },
      })
    : [];
  const slugById = new Map(relClaims.map((c) => [c.id, c.slug]));

  function endpoint(type: string, endpointId: string) {
    if (type === "claim") {
      if (endpointId === claim!.id) return <strong>this claim</strong>;
      const slug = slugById.get(endpointId);
      return (
        <a
          href={`/review/prophecy/claims/${endpointId}/`}
          className="font-semibold text-brand-600 hover:underline"
        >
          {slug ?? endpointId}
        </a>
      );
    }
    return (
      <span>
        {type} <code>{endpointId}</code>
      </span>
    );
  }

  const categoryKeys = parseKeyList(claim.categoryKeys);
  const subjectKeys = parseKeyList(claim.subjectKeys);

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <PageHead title={`Claim: ${claim.slug}`} />

      {error ? <ErrorBanner code={error} detail={detail} /> : null}
      {created ? <NoticeBanner>Claim created.</NoticeBanner> : null}
      {merged ? (
        <NoticeBanner>
          Merged <code>{merged}</code> into this claim (superseded, not deleted).
        </NoticeBanner>
      ) : null}

      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={claim.status} />
          <code className="text-slate-500 dark:text-slate-400">{claim.id}</code>
          <span className="ml-auto text-slate-400 dark:text-slate-500">
            created {fmtDate(claim.createdAt)} · updated {fmtDate(claim.updatedAt)}
          </span>
        </div>

        <p className="mt-3 text-base">{claim.text}</p>
        {claim.summary ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{claim.summary}</p>
        ) : null}

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Categories
            </dt>
            <dd className="mt-0.5">{keyLabels(categoryKeys, CATEGORY_TERMS)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Subjects
            </dt>
            <dd className="mt-0.5">{keyLabels(subjectKeys, SUBJECT_TERMS)}</dd>
          </div>
        </dl>

        {claim.supersededBy ? (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            Superseded by{" "}
            <a
              href={`/review/prophecy/claims/${claim.supersededBy.id}/`}
              className="font-semibold hover:underline"
            >
              {claim.supersededBy.slug}
            </a>
            .
          </p>
        ) : null}
        {claim.supersedes.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Supersedes:{" "}
            {claim.supersedes.map((c, i) => (
              <span key={c.id}>
                {i > 0 ? ", " : ""}
                <a
                  href={`/review/prophecy/claims/${c.id}/`}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {c.slug}
                </a>
              </span>
            ))}
          </p>
        ) : null}

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Set status
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODERATION_STATES.filter((s) => s !== claim.status && s !== "superseded").map((s) => (
              <form key={s} action={changeClaimStatus.bind(null, claim.id, s)}>
                <button
                  type="submit"
                  className={
                    s === "approved" || s === "published"
                      ? "btn-primary px-3 py-1.5 text-xs"
                      : "btn-ghost px-3 py-1.5 text-xs"
                  }
                >
                  → {s.replace(/_/g, " ")}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold">Mapped source-list entries ({claim.entryMaps.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {claim.entryMaps.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No source-list entries map to this claim yet.
            </p>
          ) : (
            claim.entryMaps.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <a
                    href={`/review/prophecy/lists/${m.entry.sourceListId}/`}
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    {m.entry.sourceList.title}
                  </a>{" "}
                  · #{m.entry.entryNumber} · {m.matchType.replace(/_/g, " ")} · confidence{" "}
                  {m.confidence} ({scoreLabel(m.confidence)})
                </p>
                <p className="mt-1">{truncate(m.entry.originalWording, 220)}</p>
                {m.rationale ? (
                  <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
                    {m.rationale}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {evaluations.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold">Evaluations ({evaluations.length})</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Component scores per dimension, each with its rationale and reviewer. They are
            deliberately <em>not</em> averaged into a single number — a composite would hide
            exactly the dimension a reader needs to check.{" "}
            <a
              href="/review/prophecy/evaluations/"
              className="font-semibold text-brand-600 hover:underline"
            >
              Disagreement queue →
            </a>
          </p>
          {evalGroups.map(([kind, rows]) => (
            <div key={kind} className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {DIMENSION_KIND_LABELS[kind] ?? kind.replace(/_/g, " ")} ({rows.length})
              </h3>
              <div className="mt-2 flex flex-col gap-2">
                {rows.map((e) => (
                  <div
                    key={`${e.dimensionKey}:${e.reviewerSlug}`}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{e.label}</span>
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {e.score}/5 · {e.scoreLabel.replace(/_/g, " ")}
                      </span>
                      {disagreedDimensions.has(e.dimensionKey) ? (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          reviewers disagree
                        </span>
                      ) : null}
                      <StatusBadge status={e.status} />
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                        <code>{e.reviewerSlug}</code> · confidence {e.confidence}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{e.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card p-6">
        <h2 className="text-lg font-bold">Merge a duplicate into this claim</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          The other claim becomes <em>superseded</em> and its entry mappings carry over — nothing
          is deleted, provenance survives.
        </p>
        <form action={mergeIntoClaim} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="canonicalId" value={claim.id} />
          <label className={`${LABEL_CLS} min-w-48 flex-1`}>
            Duplicate claim (slug or id)
            <input name="duplicateRef" required className={INPUT_CLS} />
          </label>
          <label className={`${LABEL_CLS} min-w-48 flex-1`}>
            Note (optional)
            <input name="note" className={INPUT_CLS} />
          </label>
          <button type="submit" className="btn-ghost px-4 py-2 text-sm">
            Merge into this claim
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold">Relationships ({relationships.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {relationships.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No relationships recorded.</p>
          ) : (
            relationships.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                {endpoint(r.fromType, r.fromId)}
                <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {r.type.replace(/_/g, " ")}
                </span>
                {endpoint(r.toType, r.toId)}
                {r.note ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">· {r.note}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">Revision history ({revisions.length})</h2>
        <div className="mt-3 flex flex-col gap-2">
          {revisions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No revisions recorded.</p>
          ) : (
            revisions.map((rev) => (
              <div
                key={rev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {fmtDate(rev.createdAt)}
                </span>
                <span className="text-xs font-semibold">{rev.editor || "unknown editor"}</span>
                <span className="min-w-0 flex-1 text-right text-xs text-slate-600 dark:text-slate-300">
                  {rev.note || "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

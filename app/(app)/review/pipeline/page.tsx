export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import type { ArticleDraft } from "@prisma/client";
import { CHAT_ENABLED } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "./auth";
import {
  approveDraft,
  draftNow,
  loginWithToken,
  logoutAdmin,
  rejectDraft,
  runClusterNow,
  updateDraftMeta,
} from "./actions";

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  drafting: "Drafting (Slot B)",
  scrubbing: "Scrubbing (Slot C)",
  review: "Needs your review",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
};

// The title/excerpt editor. A tiny inline server action bound to this row's
// draft id — kept here (rather than actions.ts) so updateDraftMeta itself
// can keep the plain (id, title, excerpt) signature the pipeline spec wants.
function DraftMetaForm({ draft }: { draft: ArticleDraft }) {
  async function save(formData: FormData): Promise<void> {
    "use server";
    const title = String(formData.get("title") ?? "");
    const excerpt = String(formData.get("excerpt") ?? "");
    await updateDraftMeta(draft.id, title, excerpt);
  }

  return (
    <form action={save} className="mt-4 flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Title
        <input
          name="title"
          defaultValue={draft.title ?? ""}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Excerpt
        <textarea
          name="excerpt"
          defaultValue={draft.excerpt ?? ""}
          rows={2}
          className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
        />
      </label>
      <button type="submit" className="btn-ghost self-start px-3 py-1.5 text-xs">
        Save title/excerpt
      </button>
    </form>
  );
}

function ReviewCard({ draft }: { draft: ArticleDraft }) {
  const body = draft.scrubMarkdown ?? draft.draftMarkdown ?? "";
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand-600/10 px-2.5 py-1 font-semibold text-brand-600">
          {draft.aaTopic ?? draft.topic}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {draft.distinctUsers} distinct contributor{draft.distinctUsers === 1 ? "" : "s"}
        </span>
        <span className="text-slate-400 dark:text-slate-500">· {draft.id}</span>
      </div>

      <h3 className="mt-2 text-lg font-bold">{draft.title || "(untitled)"}</h3>
      {draft.excerpt ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{draft.excerpt}</p>
      ) : null}

      {draft.scrubNotes ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Slot C residual-risk notes — read before approving</p>
          <p className="mt-1 whitespace-pre-wrap">{draft.scrubNotes}</p>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Scrubbed article body {draft.scrubMarkdown ? "" : "(not yet scrubbed — showing raw draft)"}
        </p>
        <div className="mt-1 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
          {body || "(empty)"}
        </div>
      </div>

      <DraftMetaForm draft={draft} />

      <div className="mt-5 flex flex-wrap gap-3">
        <form action={approveDraft.bind(null, draft.id)}>
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Approve →
          </button>
        </form>
        <form action={rejectDraft.bind(null, draft.id)}>
          <button type="submit" className="btn-ghost px-4 py-2 text-sm">
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}

function PendingRow({ draft }: { draft: ArticleDraft }) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">{draft.title || draft.topic}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {STATUS_LABEL[draft.status] ?? draft.status} · {draft.aaTopic ?? draft.topic} ·{" "}
          {draft.distinctUsers} distinct contributor{draft.distinctUsers === 1 ? "" : "s"}
        </p>
      </div>
      <form action={draftNow.bind(null, draft.id)}>
        <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
          Draft &amp; scrub (Slot B + C)
        </button>
      </form>
    </div>
  );
}

function HistoryRow({ draft }: { draft: ArticleDraft }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
      <span className="font-medium">{draft.title || draft.topic}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {STATUS_LABEL[draft.status] ?? draft.status}
        {draft.publishedSlug ? ` · ${draft.publishedSlug}` : ""}
      </span>
    </div>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; approved?: string }>;
}) {
  if (!CHAT_ENABLED) notFound();
  if (!process.env.ADMIN_TOKEN) notFound();

  const { error, approved } = await searchParams;
  const authed = await isAdminAuthed();

  if (!authed) {
    return (
      <div className="card mx-auto mt-10 max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Enter the admin token to reach the article review queue.
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

  const drafts = await prisma.articleDraft.findMany({ orderBy: { createdAt: "desc" } });
  const review = drafts.filter((d) => d.status === "review");
  const pending = drafts.filter((d) => ["queued", "drafting", "scrubbing"].includes(d.status));
  const history = drafts.filter((d) => ["approved", "rejected", "published"].includes(d.status));

  return (
    <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Article pipeline — review queue</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            <strong>Nothing publishes without your approval.</strong> Every draft below is a
            synthesis across multiple distinct, consenting users — never a single person's
            conversation — and every draft passes an automated scrub before it reaches you. Approving
            only stages a file on this server; committing it into artificial-atheist's{" "}
            <code>src/posts/</code> is a separate, manual step.
          </p>
        </div>
        <form action={logoutAdmin}>
          <button type="submit" className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
            Sign out
          </button>
        </form>
      </div>

      {approved ? (
        <div className="rounded-xl border border-brand-600/30 bg-brand-600/10 p-4 text-sm text-brand-700 dark:text-brand-400">
          Wrote <code>pipeline-output/{approved}</code>. Copy or commit that file into the
          artificial-atheist repo's <code>src/posts/</code> to actually publish it — this app
          never touches that repo directly.
        </div>
      ) : null}

      <section>
        <h2 className="text-lg font-bold">Needs your review ({review.length})</h2>
        <div className="mt-3 flex flex-col gap-4">
          {review.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nothing waiting on you right now.</p>
          ) : (
            review.map((d) => <ReviewCard key={d.id} draft={d} />)
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">In progress / queued ({pending.length})</h2>
          <form action={runClusterNow}>
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
              Run clustering now
            </button>
          </form>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No topic has crossed the distinct-user threshold yet.
            </p>
          ) : (
            pending.map((d) => <PendingRow key={d.id} draft={d} />)
          )}
        </div>
      </section>

      {history.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold">History</h2>
          <div className="mt-3 flex flex-col gap-2">
            {history.map((d) => (
              <HistoryRow key={d.id} draft={d} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

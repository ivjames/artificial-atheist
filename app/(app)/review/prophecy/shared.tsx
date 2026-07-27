// Shared server-side helpers for the /review/prophecy admin surface.
// NOT a "use server" file — it exports components/constants, not actions.
import { notFound, redirect } from "next/navigation";
import { adminToken, isAdminAuthed } from "../pipeline/auth";
import { PROPHECY_VOCAB, SCORE_LABELS } from "@/lib/prophecy/vocab";

// Page-level gate for every sub-page: no ADMIN_TOKEN means the surface does
// not exist; a missing/stale cookie bounces to the dashboard's login form.
// (Server actions use assertProphecyAdmin in ./actions.ts — same rules.)
export async function requireProphecyPageAuth(): Promise<void> {
  if (!adminToken()) notFound();
  if (!(await isAdminAuthed())) redirect("/review/prophecy/");
}

// Vocab slices used by the forms.
export const CATEGORY_TERMS = PROPHECY_VOCAB.filter((t) => t.kind === "category");
export const SUBJECT_TERMS = PROPHECY_VOCAB.filter((t) => t.kind === "subject");
export const SOURCE_TYPE_TERMS = PROPHECY_VOCAB.filter((t) => t.kind === "source_type");

// Shared input styling (mirrors the pipeline forms).
export const INPUT_CLS =
  "rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm font-normal normal-case tracking-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700";
export const LABEL_CLS =
  "flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

// Coerce a Next searchParams value to a plain string.
export function qp(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function fmtDate(d: Date): string {
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

// Claim.categoryKeys / subjectKeys are JSON-encoded string[] columns.
export function parseKeyList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function scoreLabel(n: number): string {
  return SCORE_LABELS[n] ?? String(n);
}

// --- badges ----------------------------------------------------------------

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  submitted: "bg-brand-600/10 text-brand-600",
  needs_changes: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  published: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
  archived: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  superseded: "bg-slate-500/10 italic text-slate-500 dark:text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const MAPPING_BADGE: Record<string, string> = {
  unmapped: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  mapped: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  disputed: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function MappingBadge({ status }: { status: string }) {
  const cls = MAPPING_BADGE[status] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

// --- banners ---------------------------------------------------------------

// Human messages for the ?error= codes the actions redirect with.
const ERROR_MESSAGES: Record<string, string> = {
  "1": "Wrong token.",
  title: "Title is required.",
  text: "Claim text is required.",
  type: "Pick a valid source type.",
  year: "Year must be a whole number between -4000 and 2100.",
  count: "Claimed count must be a whole number between 0 and 100000.",
  source: "That source does not exist.",
  slug_format: "Slug must be lowercase letters, numbers and single hyphens.",
  slug_taken: "A source list with that slug already exists.",
  status_superseded:
    "This claim was merged into another and cannot change status. Reopen it by un-merging first.",
  format: "Format must be csv or json.",
  empty: "Paste the CSV/JSON content to import.",
  claim: "Enter a claim slug or id to map to.",
  claim_not_found: "No claim matches that slug or id.",
  matchtype: "Pick a valid match type.",
  confidence: "Confidence must be a whole number from 0 to 5.",
  status: "Invalid status transition.",
  merge_ref: "Enter the slug or id of the claim to merge into this one.",
  merge_not_found: "No claim matches that slug or id.",
  merge_self: "A claim cannot be merged into itself.",
  merge_failed: "Merge failed.",
  map_failed: "Mapping failed.",
  bulk_unconfirmed:
    "Tick the confirmation box first — a bulk change applies to every claim matching the filters.",
  bulk_min_score: "Minimum mean score must be a number between 0 and 5.",
  bulk_failed: "Bulk status change failed.",
  import_failed: "Import failed.",
  create_failed: "Create failed.",
  draftload_missing: "Draft file data/prophecy/claims-draft-v1.json not found on the server.",
};

export function ErrorBanner({ code, detail }: { code: string; detail?: string }) {
  if (!code) return null;
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
      {ERROR_MESSAGES[code] ?? `Error: ${code}`}
      {detail ? <span className="block mt-1 text-xs opacity-80">{detail}</span> : null}
    </div>
  );
}

export function NoticeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-600/30 bg-brand-600/10 p-4 text-sm text-brand-700 dark:text-brand-400">
      {children}
    </div>
  );
}

// Breadcrumb-ish header used by every sub-page.
export function PageHead({ title, blurb }: { title: string; blurb?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <a href="/review/prophecy/" className="hover:underline">
          Prophecy admin
        </a>
      </p>
      <h1 className="mt-1 text-2xl font-bold">{title}</h1>
      {blurb ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{blurb}</p> : null}
    </div>
  );
}

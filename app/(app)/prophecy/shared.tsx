// Shared presentation helpers for the PUBLIC prophecy surface.
//
// Deliberately separate from app/(app)/review/prophecy/shared.tsx: the review
// helpers carry admin affordances (status transitions, error banners keyed to
// admin actions) that must never leak onto a public page. These are read-only.

import { PROPHECY_VOCAB } from "@/lib/prophecy/vocab";

// key → label lookups, built once per process from the same vocab the seed uses.
const LABELS: Record<string, Record<string, string>> = {};
for (const t of PROPHECY_VOCAB) {
  (LABELS[t.kind] ??= {})[t.key] = t.label;
}

export function vocabLabel(kind: string, key: string): string {
  return LABELS[kind]?.[key] ?? key;
}

export const CATEGORY_TERMS = PROPHECY_VOCAB.filter((t) => t.kind === "category");
export const SUBJECT_TERMS = PROPHECY_VOCAB.filter((t) => t.kind === "subject");

// Claim rows store key arrays as JSON-encoded strings (repo convention:
// JSON in TEXT columns). Never throw on malformed data — a public page
// rendering is not the place to surface a parse error.
export function parseKeys(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-600">
      {children}
    </span>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-slate-500 dark:text-slate-400">{children}</span>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

// How a source-list entry relates to the normalized claim. These are the
// structural facts that expose inflated totals (splitting, bundling,
// restatement), so they are shown plainly rather than hidden behind a score.
const MATCH_NOTE: Record<string, string> = {
  exact: "states this claim and nothing else",
  partial: "covers part of this claim",
  compound: "bundles this claim with others",
  duplicate: "restates another entry in the same list",
  near_duplicate: "restates another entry with wording drift",
  disputed: "mapping is disputed",
};

export function MatchBadge({ matchType, confidence }: { matchType: string; confidence: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700">
      <span className="font-semibold">{matchType.replace(/_/g, " ")}</span>
      <span className="text-slate-500 dark:text-slate-400">
        · {MATCH_NOTE[matchType] ?? "mapping"} · confidence {confidence}/5
      </span>
    </span>
  );
}

export function PageHead({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      {lead ? (
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{lead}</div>
      ) : null}
    </div>
  );
}

// Query-string builder that drops empties, so filter links stay clean.
export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== 0) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const selectClass =
  "rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700";

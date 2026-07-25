"use client";

import { useEffect, useState } from "react";
import type { ThreadSummary } from "./types";

// Relative "time ago" for the history list. Computed only after mount (see
// ChatHistory's `mounted` gate) so the server/client render match — Date.now()
// during SSR would otherwise desync from the client's first paint.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatHistory({
  history,
  activeId,
  disabled = false,
  onOpen,
  onNew,
}: {
  history: ThreadSummary[];
  activeId: string | null;
  disabled?: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40 sm:h-[60vh] sm:max-h-[600px] sm:min-h-[380px] sm:w-56">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand-500 dark:hover:text-brand-400"
      >
        + New chat
      </button>

      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        History
      </div>

      {history.length === 0 ? (
        <p className="px-1 py-2 text-xs text-slate-400">
          Your past conversations will show up here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto sm:max-h-none">
          {history.map((t) => {
            const active = t.id === activeId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  className={
                    "w-full rounded-lg px-2.5 py-2 text-left transition disabled:opacity-50 " +
                    (active
                      ? "bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-900/30 dark:ring-brand-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60")
                  }
                >
                  <span className="block truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                    {t.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                    {t.tier === "premium" ? (
                      <span className="rounded bg-brand-100 px-1 font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        premium
                      </span>
                    ) : null}
                    {t.closed ? <span className="text-slate-400">ended ·</span> : null}
                    <span>{mounted ? timeAgo(t.updatedAt) : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

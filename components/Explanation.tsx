"use client";

import { useEffect, useState } from "react";
import type { Source } from "@/lib/quiz";

type Props = {
  explanation: string;
  detail?: string | null;
  sources?: Source[];
  questionText: string;
  correctAnswer: string;
};

export default function Explanation({
  explanation,
  detail,
  sources = [],
  questionText,
  correctAnswer,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasMore = Boolean(detail) || sources.length > 0;

  // Lock scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {explanation}
        {hasMore ? (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Read more
              {sources.length > 0
                ? ` · ${sources.length} source${sources.length === 1 ? "" : "s"}`
                : ""}{" "}
              →
            </button>
          </>
        ) : null}
      </p>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Explanation details"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold leading-snug">{questionText}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Answer: {correctAnswer}
            </p>

            {detail ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {detail}
              </p>
            ) : null}

            {sources.length > 0 ? (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Sources
                </p>
                <ul className="flex flex-col gap-2">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {s.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { STANCE_KEY, isStance, stanceGloss, stanceLabel, type Stance } from "@/lib/stance";

// Reads the intake answers from localStorage and reveals the term for the
// player's position — the payoff for the two questions asked before the quiz.
export default function StanceReveal() {
  const [stance, setStance] = useState<Stance | null>(null);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STANCE_KEY) ?? "null");
      if (isStance(stored)) setStance(stored);
    } catch {
      /* ignore */
    }
  }, []);

  if (!stance) return null;

  const label = stanceLabel(stance);

  const reset = () => {
    try {
      localStorage.removeItem(STANCE_KEY);
    } catch {
      /* ignore */
    }
    setStance(null);
  };

  return (
    <section className="card mt-6 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        From your two answers, the word for where you stand is
      </p>
      <p className="mt-2 text-2xl font-black capitalize text-brand-600">{label}</p>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {stanceGloss(stance)}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 text-xs font-semibold text-slate-400 hover:text-brand-600 hover:underline"
      >
        Change my answers
      </button>
    </section>
  );
}

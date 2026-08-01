"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import OptionButton from "@/components/OptionButton";
import Intake from "@/components/Intake";
import { submitResult } from "@/lib/actions";
import type { QuestionView } from "@/lib/quiz";
import { STANCE_KEY, isStance, type Stance } from "@/lib/stance";

export default function QuizRunner({
  questions,
  category,
  difficulty,
}: {
  questions: QuestionView[];
  category: string | null;
  difficulty: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // Gate the quiz behind a one-time intake. `phase` starts as "loading" so we
  // can read localStorage in an effect (avoiding a hydration mismatch).
  const [phase, setPhase] = useState<"loading" | "intake" | "quiz">("loading");

  useEffect(() => {
    let stored: unknown = null;
    try {
      stored = JSON.parse(localStorage.getItem(STANCE_KEY) ?? "null");
    } catch {
      stored = null;
    }
    setPhase(isStance(stored) ? "quiz" : "intake");
  }, []);

  const finishIntake = (stance: Stance) => {
    try {
      localStorage.setItem(STANCE_KEY, JSON.stringify(stance));
    } catch {
      /* storage unavailable — proceed anyway */
    }
    setPhase("quiz");
  };

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const selected = selections[question.id];
  const hasSelection = selected !== undefined;

  const choose = (optionIndex: number) => {
    setSelections((prev) => ({ ...prev, [question.id]: optionIndex }));
  };

  const next = async () => {
    if (!hasSelection) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError(false);
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: selections[q.id],
    }));
    let stance: Stance | null = null;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STANCE_KEY) ?? "null");
      if (isStance(stored)) stance = stored;
    } catch {
      stance = null;
    }
    try {
      const { slug } = await submitResult({ answers, category, difficulty, stance });
      router.push(`/result/${slug}`);
    } catch (err) {
      console.error(err);
      // Surface the failure — a silent console.error left everyone (sighted
      // and screen-reader users alike) stuck on a disabled "Scoring…" button
      // with no explanation (QA scan, WCAG 4.1.3). role="alert" announces it.
      setSubmitError(true);
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return <div className="h-2" aria-hidden />;
  }
  if (phase === "intake") {
    return <Intake onDone={finishIntake} />;
  }

  return (
    <div>
      <ProgressBar current={index} total={questions.length} />

      <div key={question.id} className="card mt-5 animate-fade-in-up p-6 sm:p-8">
        <div className="mb-4 flex gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          <span>{question.category}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">{question.difficulty}</span>
        </div>
        <h2 className="font-display text-xl font-medium leading-snug">{question.text}</h2>

        <div className="mt-6 flex flex-col gap-3">
          {question.options.map((opt, i) => (
            <OptionButton
              key={i}
              label={opt}
              selected={selected === i}
              onClick={() => choose(i)}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || submitting}
        >
          ← Back
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={next}
          disabled={!hasSelection || submitting}
        >
          {submitting ? "Scoring…" : isLast ? "See results →" : "Next →"}
        </button>
      </div>

      {submitError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          Couldn&apos;t submit your answers — check your connection and press
          &ldquo;See results&rdquo; to try again.
        </p>
      )}
    </div>
  );
}

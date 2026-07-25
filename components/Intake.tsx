"use client";

import { useState } from "react";
import type { Belief, Knowledge, Stance } from "@/lib/stance";

// Each axis has several interchangeable phrasings (jargon-free). One is picked
// at random per visit. The option `value`s are fixed, so whichever wording
// shows, the stored belief/knowledge — and thus atheist/agnostic — is identical.
type Variant = { prompt: string; options: { label: string; value: string }[] };
type Axis = { key: "belief" | "knowledge"; variants: Variant[] };

const AXES: Axis[] = [
  {
    key: "belief",
    variants: [
      {
        prompt: "When you think about how everything came to be, which is closer to your view?",
        options: [
          { label: "A god or higher power is behind it all", value: "yes" },
          { label: "It’s all natural — nothing behind it", value: "no" },
        ],
      },
      {
        prompt: "Gut feeling: is there some kind of god or higher power out there?",
        options: [
          { label: "Yeah, I think so", value: "yes" },
          { label: "No, I don’t think so", value: "no" },
        ],
      },
      {
        prompt: "When you look at the universe, do you sense any intention behind it?",
        options: [
          { label: "Yes — something intended this", value: "yes" },
          { label: "No — it just is", value: "no" },
        ],
      },
      {
        prompt: "Do you personally believe in a god or higher power of any kind?",
        options: [
          { label: "Yes, I do", value: "yes" },
          { label: "No, I don’t", value: "no" },
        ],
      },
      {
        prompt: "Which feels truer to you?",
        options: [
          { label: "There’s something greater than the physical world", value: "yes" },
          { label: "The physical world is all there is", value: "no" },
        ],
      },
    ],
  },
  {
    key: "knowledge",
    variants: [
      {
        prompt: "And do you think this is something anyone could ever really know for certain?",
        options: [
          { label: "Yes — it’s something we can know", value: "knowable" },
          { label: "No — it’s beyond what we can know", value: "unknowable" },
        ],
      },
      {
        prompt: "Could anyone ever actually know the answer for sure?",
        options: [
          { label: "Yes, it’s knowable", value: "knowable" },
          { label: "No, we can’t ever really know", value: "unknowable" },
        ],
      },
      {
        prompt: "Be honest — can a person be truly certain either way?",
        options: [
          { label: "Yes, certainty is possible", value: "knowable" },
          { label: "No, nobody can be certain", value: "unknowable" },
        ],
      },
      {
        prompt: "Is this a question with a findable answer, or one that’s out of reach?",
        options: [
          { label: "It has a findable answer", value: "knowable" },
          { label: "It’s out of reach", value: "unknowable" },
        ],
      },
      {
        prompt: "Do you think there’s any way to know for sure, one way or the other?",
        options: [
          { label: "There’s a way to know", value: "knowable" },
          { label: "No way to know for sure", value: "unknowable" },
        ],
      },
    ],
  },
];

export default function Intake({ onDone }: { onDone: (stance: Stance) => void }) {
  const [step, setStep] = useState(0);
  const [belief, setBelief] = useState<Belief | null>(null);
  const [knowledge, setKnowledge] = useState<Knowledge | null>(null);
  // Random phrasing per axis, fixed for the life of this intake (client-only,
  // so no SSR hydration mismatch — Intake never renders on the server).
  const [picks] = useState(() => AXES.map((a) => Math.floor(Math.random() * a.variants.length)));

  const variant = AXES[step].variants[picks[step]];
  const current = step === 0 ? belief : knowledge;

  const choose = (value: string) => {
    if (step === 0) {
      setBelief(value as Belief);
      setTimeout(() => setStep(1), 160);
    } else {
      const k = value as Knowledge;
      setKnowledge(k);
      setTimeout(() => onDone({ belief: belief as Belief, knowledge: k }), 160);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-slate-400">
        <span>Before we start — two quick questions about you</span>
        <span>{step + 1} of 2</span>
      </div>
      <section key={step} className="card animate-fade-in-up p-6 sm:p-8">
        <h2 className="text-xl font-bold leading-snug">{variant.prompt}</h2>
        <div className="mt-6 flex flex-col gap-3">
          {variant.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => choose(opt.value)}
              className={
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition " +
                (current === opt.value
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
                  : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>
      <p className="mt-4 px-1 text-center text-xs text-slate-400">
        No wrong answers — this just personalizes your result.
      </p>
    </div>
  );
}

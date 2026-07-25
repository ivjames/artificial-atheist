"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "random" | "topic" | "difficulty";

const MODES: { key: Mode; label: string; desc: string }[] = [
  { key: "random", label: "Random mix", desc: "Questions from every topic and level" },
  { key: "topic", label: "By topic", desc: "Focus on one category" },
  { key: "difficulty", label: "By difficulty", desc: "Pick a challenge level" },
];

function Pills({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
              (active
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300")
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function StartForm({
  categories,
  difficulties,
}: {
  categories: string[];
  difficulties: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("random");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [difficulty, setDifficulty] = useState(difficulties[0] ?? "");
  const [starting, setStarting] = useState(false);

  const start = () => {
    setStarting(true);
    const params = new URLSearchParams();
    if (mode === "topic" && category) params.set("category", category);
    if (mode === "difficulty" && difficulty) params.set("difficulty", difficulty);
    params.set("play", "1");
    router.push(`/quiz?${params.toString()}`);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      {/* Mode selector */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={
                "rounded-xl border p-3 text-left transition " +
                (active
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-slate-200 hover:border-brand-300 dark:border-slate-800 dark:hover:bg-slate-800/50")
              }
            >
              <span
                className={
                  "block text-sm font-semibold " + (active ? "text-brand-700 dark:text-brand-200" : "")
                }
              >
                {m.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-options for the active mode */}
      {mode === "topic" ? (
        <Pills value={category} options={categories} onChange={setCategory} />
      ) : null}
      {mode === "difficulty" ? (
        <Pills value={difficulty} options={difficulties} onChange={setDifficulty} />
      ) : null}

      <button
        type="button"
        className="btn-primary w-full py-3 text-base"
        onClick={start}
        disabled={
          starting ||
          (mode === "topic" && !category) ||
          (mode === "difficulty" && !difficulty)
        }
      >
        {starting
          ? "Loading…"
          : mode === "random"
            ? "Start random quiz →"
            : mode === "topic"
              ? `Start ${category} quiz →`
              : `Start ${difficulty} quiz →`}
      </button>
    </div>
  );
}

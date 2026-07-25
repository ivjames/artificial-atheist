"use client";

import { useState } from "react";
import { claimLeaderboardName } from "@/lib/actions";

export default function ClaimName({
  slug,
  initialName,
}: {
  slug: string;
  initialName: string | null;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [saved, setSaved] = useState(Boolean(initialName));
  const [pending, setPending] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setPending(true);
    const res = await claimLeaderboardName(slug, name);
    setPending(false);
    if (res.ok) setSaved(true);
  };

  if (saved) {
    return (
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Added to the leaderboard as <span className="font-semibold">{name}</span>.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name for the leaderboard"
        maxLength={30}
        className="w-full max-w-xs rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none dark:border-slate-700"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending || !name.trim()}
        className="btn-primary shrink-0"
      >
        {pending ? "Saving…" : "Add me"}
      </button>
    </div>
  );
}

"use client";

import type { ChatTier } from "@/lib/agent/chat";

// Switching tier while a thread is active starts a NEW thread (§4 — the burn
// is made transparent by ChatClient, which resets local thread state on
// change). This component only renders the two choices and their cost.
export default function TierToggle({
  tier,
  costs,
  onChange,
  disabled,
}: {
  tier: ChatTier;
  costs: { standard: number; premium: number };
  onChange: (tier: ChatTier) => void;
  disabled?: boolean;
}) {
  const options: { key: ChatTier; label: string; cost: number }[] = [
    { key: "standard", label: "Standard", cost: costs.standard },
    { key: "premium", label: "Deep debate", cost: costs.premium },
  ];

  return (
    <div className="flex gap-2" role="group" aria-label="Debate tier">
      {options.map((o) => {
        const active = tier === o.key;
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 " +
              (active
                ? "bg-brand-600 text-white"
                : "border border-slate-300 text-slate-600 hover:border-brand-400 dark:border-slate-700 dark:text-slate-300")
            }
          >
            {o.label} · {o.cost} credit{o.cost === 1 ? "" : "s"}
          </button>
        );
      })}
    </div>
  );
}

// Central, env-driven configuration for the debate-chat + credit + pipeline
// system. Everything is overridable by environment variable so model choices,
// credit economics, and thresholds can be tuned without a code change — the
// concept spec treats all of these as post-launch tunables (§3, §8, §9).

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envStr(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw == null || raw.trim() === "" ? fallback : raw;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

// Master kill-switch. While false the entire chat surface (routes, pages,
// contact gate) is dark and NO email/conversation data is collected. Keep it
// false until the §6 legal review is signed off (LAUNCH-BLOCKERS.md).
export const CHAT_ENABLED = envBool("CHAT_ENABLED", false);

export const SITE_URL = envStr(
  "NEXT_PUBLIC_SITE_URL",
  "https://artificialatheist.com",
);

// --- Model routing (three independent slots, §3) --------------------------
// Slot A = live chat (standard/premium tiers), B = article writer, C = scrub.
// Defaults follow the spec's "Locked" decisions; each is env-swappable so a
// vendor can change per slot without touching the rest (provider-abstracted).
export const models = {
  // Slot A standard — Claude Haiku 4.5 (won the debate eval among cheap models).
  standard: {
    provider: envStr("MODEL_STANDARD_PROVIDER", "anthropic"),
    model: envStr("MODEL_STANDARD", "claude-haiku-4-5"),
  },
  // Slot A premium "deep debate" — Claude Sonnet (interim; Grok 4.5 parked, §6).
  premium: {
    provider: envStr("MODEL_PREMIUM_PROVIDER", "anthropic"),
    model: envStr("MODEL_PREMIUM", "claude-sonnet-4-5"),
  },
  // Slot B article writer — separate frontier writer, decoupled from chat.
  writer: {
    provider: envStr("MODEL_WRITER_PROVIDER", "anthropic"),
    model: envStr("MODEL_WRITER", "claude-sonnet-4-5"),
  },
  // Slot C PII scrub / review support — reliability-first instruction follower.
  scrub: {
    provider: envStr("MODEL_SCRUB_PROVIDER", "anthropic"),
    model: envStr("MODEL_SCRUB", "claude-sonnet-4-5"),
  },
} as const;

export type SlotName = keyof typeof models;

// --- Credit economics (§4, §8) --------------------------------------------
// Per-question at launch (per-token metering is a documented v2). A credit
// buys one standard question; premium costs more credits (default 3×).
export const credits = {
  freeQuota: envInt("FREE_QUESTION_QUOTA", 5), // free questions per signup
  standardCost: envInt("STANDARD_CREDIT_COST", 1),
  premiumCost: envInt("PREMIUM_CREDIT_COST", 3),
  // Preview test top-up is only offered when the balance is at/below this.
  lowBalanceThreshold: envInt("LOW_BALANCE_THRESHOLD", 5),
};

// Per-thread token budget (§4 thread cap). Once a thread's accumulated
// input+output tokens cross this, the user is prompted to start a fresh
// thread (which resets context and lowers per-turn cost).
export const threadTokenBudget = envInt("THREAD_TOKEN_BUDGET", 40_000);

// Max tokens the model may generate per reply (keeps output cost bounded). The
// old 800 default truncated longer debate replies mid-sentence (visible as
// chopped transcripts in the adversary eval, and it would chop live replies
// too); 2000 gives a complete reply room to land. Still env-tunable to dial
// live-chat economics back at launch.
export const maxOutputTokens = envInt("MAX_OUTPUT_TOKENS", 2000);

// Live-reply length backstop. The persona caps a debate reply at ~8 sentences,
// but the model ignores it against sophisticated opponents (the adversary eval
// shows ~15 with nearly every reply over the ceiling), and prompt tuning didn't
// move it. So chat.ts trims a reply to this many sentences before it ships —
// at a sentence boundary, not mid-word like a token cap. Set to the persona's
// own ceiling, not a brutal floor, so a well-formed reply is rarely cut; env-
// tunable. This trims only the LIVE reply — the eval still scores raw output.
export const maxReplySentences = envInt("MAX_REPLY_SENTENCES", 8);

// --- Credit packs (§8) ----------------------------------------------------
// Minimum pack pushed to ~$5 so Stripe's fixed $0.30 doesn't dominate (§8).
export type CreditPack = {
  id: string;
  label: string;
  credits: number;
  amountCents: number;
};

export const creditPacks: CreditPack[] = [
  { id: "starter", label: "Starter", credits: 45, amountCents: 500 },
  { id: "standard", label: "Standard", credits: 100, amountCents: 1000 },
  { id: "deep", label: "Deep Debate", credits: 300, amountCents: 2500 },
];

export function findPack(id: string): CreditPack | undefined {
  return creditPacks.find((p) => p.id === id);
}

// --- Article pipeline (§5) ------------------------------------------------
// A topic is eligible for an article only once it has drawn questions from at
// least this many DISTINCT users (counted, not questions). Start 5–8, tune.
export const clusterMinUsers = envInt("CLUSTER_MIN_USERS", 6);

// --- Abuse rate limits (§8) -----------------------------------------------
// Best-effort throttles (in-memory, per process — see lib/ratelimit.ts). Tune
// via env. Magic-link farming (free-to-mint email → 5 free questions) is the
// main vector, so auth requests are throttled per IP and per email.
export const rateLimits = {
  authPerIpPerHour: envInt("RL_AUTH_IP_PER_HOUR", 10),
  authPerEmailPerHour: envInt("RL_AUTH_EMAIL_PER_HOUR", 5),
  chatPerUserPerMin: envInt("RL_CHAT_PER_MIN", 20),
  topUpPerHour: envInt("RL_TOPUP_PER_HOUR", 5), // preview test top-up
};

// --- Payments -------------------------------------------------------------
export const paymentsProvider = envStr(
  "PAYMENTS_PROVIDER",
  process.env.STRIPE_SECRET_KEY ? "stripe" : "stub",
);

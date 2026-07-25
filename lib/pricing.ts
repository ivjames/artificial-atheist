// Real model-provider pricing for the token/cost/profit display (§8/§9
// economics). Prices are USD per MILLION tokens, input/output. Defaults are
// Anthropic list prices (Haiku 4.5 $1/$5, Sonnet $3/$15); override the whole
// map with the MODEL_PRICES env var (JSON: { "<model-id>": {"input":N,"output":N} }).
export type ModelPrice = { input: number; output: number };

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-5": { input: 5, output: 25 },
};

// Used when a model id isn't in the table — Sonnet-tier, so profit is never
// flattered by an unknown cheaper price.
const FALLBACK: ModelPrice = { input: 3, output: 15 };

function prices(): Record<string, ModelPrice> {
  const raw = process.env.MODEL_PRICES;
  if (!raw) return DEFAULT_PRICES;
  try {
    return { ...DEFAULT_PRICES, ...(JSON.parse(raw) as Record<string, ModelPrice>) };
  } catch {
    return DEFAULT_PRICES;
  }
}

export function modelCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = prices()[model] ?? FALLBACK;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// Revenue per credit, USD. Default from the Standard pack ($10 / 100 credits =
// $0.10). Override with CREDIT_USD.
export function creditUnitPriceUsd(): number {
  const n = Number.parseFloat(process.env.CREDIT_USD ?? "");
  return Number.isFinite(n) && n > 0 ? n : 0.1;
}

export type TurnEconomics = {
  model: string;
  inputTokens: number; // CONVERSATION input tokens (persona + history + message)
  outputTokens: number;
  refInputTokens: number; // platform-injected article-reference tokens
  costUsd: number; // real provider cost of this turn (conversation + references)
  refCostUsd: number; // the reference-library share of costUsd
  creditsCharged: number;
  revenueUsd: number; // credits charged × per-credit price
  profitUsd: number; // revenue − cost
};

// Conversation input tokens and the platform-injected reference tokens are
// passed separately: the visitor's token counter and thread budget see only
// the conversation, while cost/profit still reflect the true total spend (the
// reference library is a real, if small, provider cost).
export function turnEconomics(
  model: string,
  inputTokens: number,
  outputTokens: number,
  refInputTokens: number,
  creditsCharged: number,
): TurnEconomics {
  const refCostUsd = modelCostUsd(model, refInputTokens, 0);
  const costUsd = modelCostUsd(model, inputTokens, outputTokens) + refCostUsd;
  const revenueUsd = creditsCharged * creditUnitPriceUsd();
  return {
    model,
    inputTokens,
    outputTokens,
    refInputTokens,
    costUsd,
    refCostUsd,
    creditsCharged,
    revenueUsd,
    profitUsd: revenueUsd - costUsd,
  };
}

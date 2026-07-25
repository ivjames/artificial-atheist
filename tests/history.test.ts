import { describe, it, expect, afterEach } from "vitest";
import {
  toTitle,
  toTier,
  summarizeThreads,
  threadEconomics,
  type ThreadRow,
} from "@/lib/chat/history";

function msg(role: string, content: string, at: string) {
  return { role, content, createdAt: new Date(at) };
}

// Keep the pricing math on its documented defaults regardless of ambient env.
const PRICE_KEYS = ["MODEL_PRICES", "CREDIT_USD", "STANDARD_CREDIT_COST", "PREMIUM_CREDIT_COST"];
afterEach(() => {
  for (const k of PRICE_KEYS) delete process.env[k];
});

describe("toTitle", () => {
  it("uses the message text, collapsing whitespace", () => {
    expect(toTitle("  Does   free will\nexist? ")).toBe("Does free will exist?");
  });

  it("truncates long text with an ellipsis", () => {
    const long = "a".repeat(200);
    const title = toTitle(long);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(70);
  });

  it("falls back to a generic label for empty/whitespace/undefined", () => {
    expect(toTitle("")).toBe("New conversation");
    expect(toTitle("   ")).toBe("New conversation");
    expect(toTitle(undefined)).toBe("New conversation");
  });
});

describe("toTier", () => {
  it("maps premium and defaults everything else to standard", () => {
    expect(toTier("premium")).toBe("premium");
    expect(toTier("standard")).toBe("standard");
    expect(toTier("garbage")).toBe("standard");
  });
});

describe("summarizeThreads", () => {
  it("skips threads with no visible messages", () => {
    const threads: ThreadRow[] = [
      { id: "empty", tier: "standard", closedAt: null, messages: [] },
      {
        id: "has-msgs",
        tier: "standard",
        closedAt: null,
        messages: [msg("user", "hi", "2026-07-20T10:00:00Z")],
      },
    ];
    const out = summarizeThreads(threads);
    expect(out.map((t) => t.id)).toEqual(["has-msgs"]);
  });

  it("titles from the first USER message, not an assistant preamble", () => {
    const threads: ThreadRow[] = [
      {
        id: "t1",
        tier: "standard",
        closedAt: null,
        messages: [
          msg("assistant", "Welcome — make your case.", "2026-07-20T10:00:00Z"),
          msg("user", "Prove a god exists.", "2026-07-20T10:00:05Z"),
        ],
      },
    ];
    expect(summarizeThreads(threads)[0].title).toBe("Prove a god exists.");
  });

  it("marks closed threads and counts messages", () => {
    const threads: ThreadRow[] = [
      {
        id: "t1",
        tier: "premium",
        closedAt: new Date("2026-07-20T11:00:00Z"),
        messages: [
          msg("user", "a", "2026-07-20T10:00:00Z"),
          msg("assistant", "b", "2026-07-20T10:00:01Z"),
        ],
      },
    ];
    const s = summarizeThreads(threads)[0];
    expect(s.closed).toBe(true);
    expect(s.tier).toBe("premium");
    expect(s.messageCount).toBe(2);
    expect(s.updatedAt).toBe("2026-07-20T10:00:01.000Z"); // last message time
  });

  it("orders by most-recent activity, not thread order", () => {
    const threads: ThreadRow[] = [
      {
        id: "old",
        tier: "standard",
        closedAt: null,
        messages: [msg("user", "old", "2026-07-01T00:00:00Z")],
      },
      {
        id: "recent",
        tier: "standard",
        closedAt: null,
        messages: [msg("user", "recent", "2026-07-24T00:00:00Z")],
      },
    ];
    expect(summarizeThreads(threads).map((t) => t.id)).toEqual(["recent", "old"]);
  });
});

describe("threadEconomics", () => {
  function turn(model: string | null, inputTokens: number, outputTokens: number) {
    return { role: "assistant", model, inputTokens, outputTokens };
  }

  it("sums only assistant turns; user rows carry no cost", () => {
    // Haiku defaults: $1/M in, $5/M out. Credit $0.10, standard cost 1.
    const e = threadEconomics("standard", [
      { role: "user", model: null, inputTokens: 0, outputTokens: 0 },
      turn("claude-haiku-4-5", 1000, 500), // (1000*1 + 500*5)/1e6 = 0.0035
      { role: "user", model: null, inputTokens: 0, outputTokens: 0 },
      turn("claude-haiku-4-5", 2000, 800), // (2000*1 + 800*5)/1e6 = 0.006
    ]);
    expect(e.turns).toBe(2);
    expect(e.inputTokens).toBe(3000);
    expect(e.outputTokens).toBe(1300);
    expect(e.costUsd).toBeCloseTo(0.0095, 10);
    expect(e.revenueUsd).toBeCloseTo(0.2, 10); // 2 turns × 1 credit × $0.10
    expect(e.profitUsd).toBeCloseTo(0.2 - 0.0095, 10);
  });

  it("prices premium turns at the premium credit rate", () => {
    const e = threadEconomics("premium", [turn("claude-sonnet-4-5", 1000, 1000)]);
    // Sonnet $3/M in, $15/M out → (3000 + 15000)/1e6 = 0.018
    expect(e.costUsd).toBeCloseTo(0.018, 10);
    // premium = 3 credits × $0.10 = $0.30
    expect(e.revenueUsd).toBeCloseTo(0.3, 10);
  });

  it("tracks reference-library tokens separately and folds their cost into the total", () => {
    // Haiku $1/M in. Conversation 1000 in / 0 out = $0.001; refs 400 = $0.0004.
    const e = threadEconomics("standard", [
      { role: "assistant", model: "claude-haiku-4-5", inputTokens: 1000, refInputTokens: 400, outputTokens: 0 },
    ]);
    expect(e.inputTokens).toBe(1000); // conversation only — refs excluded
    expect(e.refInputTokens).toBe(400);
    expect(e.refCostUsd).toBeCloseTo(0.0004, 10);
    expect(e.costUsd).toBeCloseTo(0.0014, 10); // conversation + reference cost
  });

  it("is all-zero for a thread with no assistant turns", () => {
    const e = threadEconomics("standard", [
      { role: "user", model: null, inputTokens: 0, outputTokens: 0 },
    ]);
    expect(e).toEqual({
      turns: 0,
      inputTokens: 0,
      outputTokens: 0,
      refInputTokens: 0,
      costUsd: 0,
      refCostUsd: 0,
      revenueUsd: 0,
      profitUsd: 0,
    });
  });
});

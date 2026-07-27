import { describe, expect, it } from "vitest";
import {
  stripQuotedSpans,
  trailingQuestionRun,
  trimStackedClosingQuestions,
} from "@/lib/agent/questions";

// These helpers back both the adversary eval metric (scoreAgentTurns) and the
// live guardrail (chat.ts). The debate persona forbids stacking questions at
// the visitor; the tests pin the exact "closing run" semantics both rely on.

describe("stripQuotedSpans", () => {
  it("removes straight and curly double-quoted spans, keeps contractions", () => {
    const stripped = stripQuotedSpans('He said "why not?" loudly');
    expect(stripped).not.toContain("why not");
    expect(stripped.replace(/\s+/g, " ").trim()).toBe("He said loudly");
    expect(stripQuotedSpans("don't — it's fine")).toBe("don't — it's fine");
  });
});

describe("trailingQuestionRun", () => {
  it("counts the contiguous question run at the very end", () => {
    expect(trailingQuestionRun("Order looks designed. Which is it? And why?")).toBe(2);
    expect(trailingQuestionRun("Order looks designed. Which is it?")).toBe(1);
  });

  it("is zero when a declarative sentence follows a rhetorical question", () => {
    expect(trailingQuestionRun("What caused God? That just relocates the problem.")).toBe(0);
  });

  it("is zero when the reply ends on an unterminated fragment", () => {
    expect(trailingQuestionRun("Why is that so — the claim that")).toBe(0);
  });
});

describe("trimStackedClosingQuestions", () => {
  it("keeps the first question of a stacked closing and drops the pile-on", () => {
    const input =
      "Order looks designed. So which is it, design or chance? And why should I trust that inference?";
    expect(trimStackedClosingQuestions(input)).toBe(
      "Order looks designed. So which is it, design or chance?",
    );
  });

  it("collapses three-plus stacked questions to the first", () => {
    expect(trimStackedClosingQuestions("X is false. Why A? Why B? Why C?")).toBe(
      "X is false. Why A?",
    );
  });

  it("keeps a single closing question", () => {
    const input = "Order looks designed. So which is it, design or chance?";
    expect(trimStackedClosingQuestions(input)).toBe(input);
  });

  it("leaves a rhetorical-then-declarative reply untouched", () => {
    const input = "What caused God? That just relocates the problem.";
    expect(trimStackedClosingQuestions(input)).toBe(input);
  });

  it("does not trim questions the agent merely quotes", () => {
    const input = 'You keep pressing the old line, "why is there something rather than nothing?"';
    expect(trimStackedClosingQuestions(input)).toBe(input);
  });

  it("reduces an all-questions reply to a single question", () => {
    expect(trimStackedClosingQuestions("Why A? Why B?")).toBe("Why A?");
  });

  it("preserves trailing whitespace", () => {
    expect(trimStackedClosingQuestions("X. Why A? Why B?\n")).toBe("X. Why A?\n");
  });
});

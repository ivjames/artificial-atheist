import { describe, expect, it } from "vitest";
import {
  PERSONAS,
  getPersona,
  personaNames,
  buildAdversaryPrompt,
  withDials,
  openerInstruction,
  scoreAgentTurns,
  ARGUMENTS,
  argumentKeys,
} from "@/lib/agent/adversary";
import { aggregateStats, runCostUsd, type ParsedRun } from "@/lib/adversaryRuns";

// The adversary persona library is pure (no model calls), so it's fully unit
// testable. These guard the invariants the harness relies on and the safety
// rails that keep the eval valid.

describe("persona catalog", () => {
  it("has unique, stable names and a full sophistication spread", () => {
    const names = personaNames();
    expect(new Set(names).size).toBe(names.length);
    const levels = new Set(PERSONAS.map((p) => p.dials.sophistication));
    // The spectrum should span low to high "mental capacity".
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(5);
  });

  it("resolves personas case-insensitively", () => {
    expect(getPersona("PROFESSOR")?.name).toBe("professor");
    expect(getPersona("nope")).toBeUndefined();
  });

  it("every persona's focus is a real argument key or 'mixed'", () => {
    const keys = argumentKeys();
    for (const p of PERSONAS) {
      const ok = p.dials.focus === "mixed" || keys.includes(p.dials.focus as never);
      expect(ok, `${p.name} focus=${p.dials.focus}`).toBe(true);
    }
  });
});

describe("buildAdversaryPrompt", () => {
  const prompt = buildAdversaryPrompt(getPersona("professor")!);

  it("embeds the character and the length/tone guidance", () => {
    expect(prompt).toContain("trained apologist");
    expect(prompt).toContain("Reasoning level: expert");
  });

  it("keeps the safety rails that keep the test valid", () => {
    // Must never claim to be a minor (would trip the agent's minor backstop).
    expect(prompt).toMatch(/ADULT/);
    // No slurs / harassment / meta-breaking.
    expect(prompt).toMatch(/slurs/i);
    expect(prompt).toMatch(/in character/i);
  });

  it("reflects dial overrides in the composed prompt", () => {
    const nasty = withDials(getPersona("seeker")!, {
      hostility: "sneering",
      verbosity: "terse",
      sophistication: 1,
    });
    const p = buildAdversaryPrompt(nasty);
    expect(p).toContain("smug and dismissive");
    expect(p).toContain("one or two short lines");
    expect(p).toContain("Reasoning level: very low");
  });

  it("names the anchored argument when focus is not mixed", () => {
    const p = buildAdversaryPrompt(getPersona("zealot")!);
    expect(p).toContain(ARGUMENTS.pascals_wager.label);
  });
});

describe("withDials", () => {
  it("overrides only the given dials and does not mutate the base", () => {
    const base = getPersona("everyman")!;
    const before = base.dials.sophistication;
    const tuned = withDials(base, { sophistication: 5 });
    expect(tuned.dials.sophistication).toBe(5);
    expect(tuned.dials.verbosity).toBe(base.dials.verbosity);
    expect(base.dials.sophistication).toBe(before); // untouched
  });
});

describe("openerInstruction", () => {
  it("appends a seed when given", () => {
    expect(openerInstruction()).not.toContain("Open specifically");
    expect(openerInstruction("the moral argument")).toContain("the moral argument");
  });
});

describe("argument catalog", () => {
  it("every entry has a label, gloss, and opener", () => {
    for (const [key, a] of Object.entries(ARGUMENTS)) {
      expect(a.label, key).toBeTruthy();
      expect(a.gloss, key).toBeTruthy();
      expect(a.opener, key).toBeTruthy();
    }
  });
});

describe("scoreAgentTurns", () => {
  it("returns zeros for an empty transcript", () => {
    const m = scoreAgentTurns([]);
    expect(m.agentTurns).toBe(0);
    expect(m.agentAvgWords).toBe(0);
  });

  it("flags engagement hooks at the end of a reply", () => {
    const m = scoreAgentTurns([
      "The Kalam smuggles in its conclusion. Want to dig deeper?",
      "That's a category error. Let me know if you'd like more.",
      "Evidence, not assertion, carries the burden here.", // clean
    ]);
    expect(m.hookViolations).toBe(2);
    expect(m.agentTurns).toBe(3);
  });

  it("does not flag a mid-reply 'let me know' that ends cleanly", () => {
    const m = scoreAgentTurns([
      "You claim design; let me know which constant you mean, because the physics doesn't support fine-tuning as stated and the multiverse remains live.",
    ]);
    expect(m.hookViolations).toBe(0);
  });

  it("counts trailing and multi-question replies", () => {
    const m = scoreAgentTurns([
      "What grounds that claim?", // trailing question, single
      "Is it necessary? Or merely asserted?", // trailing + multi
      "No question here.",
    ]);
    expect(m.trailingQuestions).toBe(2);
    expect(m.multiQuestionTurns).toBe(1);
  });

  it("does not count questions the agent only quotes", () => {
    const m = scoreAgentTurns([
      // A quoted question + no question of the agent's own → neither flag.
      'You ask "where did it come from?" but that just assumes a cause.',
      // A quoted question alongside ONE genuine question → not multi, but trailing.
      'You keep asking "why is there something rather than nothing?" — so what grounds necessity?',
    ]);
    expect(m.multiQuestionTurns).toBe(0);
    expect(m.trailingQuestions).toBe(1); // only the second reply, and via its own question
  });

  it("still flags two genuine (un-quoted) questions", () => {
    const m = scoreAgentTurns([
      "On what grounds? And why grant that the category applies to reality?",
    ]);
    expect(m.multiQuestionTurns).toBe(1);
  });

  it("does not flag rhetorical questions woven into the argument body", () => {
    // The Galloper regression: the agent poses dialectical questions mid-reply
    // (Euthyphro, "what caused God?") and then answers them. These are allowed
    // — only questions fired at the visitor in the CLOSING run count.
    const m = scoreAgentTurns([
      "A transcendent cause doesn't solve this; what caused God? That just " +
        "relocates the puzzle. And is it good because God commands it, or does " +
        "God command it because it's good? Either way, you don't need Him. The " +
        "honest answer is that we don't yet know.",
    ]);
    expect(m.multiQuestionTurns).toBe(0);
    expect(m.trailingQuestions).toBe(0);
  });

  it("flags questions stacked at the visitor in the closing", () => {
    const m = scoreAgentTurns([
      "Fine-tuning has no denominator to make it improbable. So which is it — " +
        "design, or a selection effect across many universes? And why should I " +
        "grant your prior?",
    ]);
    expect(m.multiQuestionTurns).toBe(1);
    expect(m.trailingQuestions).toBe(1);
  });

  it("exempts a single substantive closing question from the stacked flag", () => {
    // Rule 17 allows a lone closing Socratic challenge; only stacking is flagged.
    const m = scoreAgentTurns([
      "Evolution explains why we recognize harm; it doesn't make harm unreal. " +
        "So what, exactly, does a divine command add to the wrongness of genocide?",
    ]);
    expect(m.multiQuestionTurns).toBe(0);
    expect(m.trailingQuestions).toBe(1);
  });
});

const mkRun = (over: Partial<ParsedRun>): ParsedRun =>
  ({
    id: over.id ?? "x",
    createdAt: new Date("2026-07-25T00:00:00Z"),
    persona: over.persona ?? "professor",
    label: over.label ?? "The trained apologist",
    tier: over.tier ?? "standard",
    adversaryModel: over.adversaryModel ?? "anthropic:claude-sonnet-4-5",
    sophistication: 5,
    verbosity: "medium",
    hostility: "civil",
    focus: "mixed",
    turns: 2,
    seed: null,
    runStamp: "2026-07-25_00-00-00",
    inputTokens: over.inputTokens ?? 100,
    outputTokens: over.outputTokens ?? 50,
    transcript: over.transcript ?? [],
    metrics:
      over.metrics ??
      {
        agentTurns: 2,
        agentAvgChars: 200,
        agentAvgWords: 40,
        hookViolations: 1,
        trailingQuestions: 1,
        multiQuestionTurns: 0,
      },
  }) as ParsedRun;

describe("runCostUsd", () => {
  it("splits combined tokens per model and costs each side", () => {
    // standard tier → agent on Haiku 4.5 ($1/$5); adversary on Sonnet 4.5 ($3/$15).
    const run = mkRun({
      tier: "standard",
      adversaryModel: "anthropic:claude-sonnet-4-5",
      transcript: [
        { speaker: "adversary", content: "", inTok: 1000, outTok: 200 },
        { speaker: "agent", content: "", inTok: 2000, outTok: 300 },
      ],
    });
    // agent (haiku):  2000*1 + 300*5  = 3500 → $0.0035
    // adversary (sonnet): 1000*3 + 200*15 = 6000 → $0.0060
    expect(runCostUsd(run)).toBeCloseTo(0.0095, 6);
  });

  it("costs the agent side at premium (Sonnet) rates on --tier premium", () => {
    const run = mkRun({
      tier: "premium",
      adversaryModel: "anthropic:claude-sonnet-4-5",
      transcript: [{ speaker: "agent", content: "", inTok: 1000, outTok: 100 }],
    });
    // agent (sonnet): 1000*3 + 100*15 = 4500 → $0.0045
    expect(runCostUsd(run)).toBeCloseTo(0.0045, 6);
  });

  it("is zero when the transcript has no tokens", () => {
    expect(runCostUsd(mkRun({}))).toBe(0);
  });
});

describe("aggregateStats", () => {
  it("sums tokens/violations and weights avg words by agent turns", () => {
    const runs = [
      mkRun({
        persona: "professor",
        metrics: {
          agentTurns: 4,
          agentAvgChars: 0,
          agentAvgWords: 50,
          hookViolations: 2,
          trailingQuestions: 0,
          multiQuestionTurns: 1,
        },
      }),
      mkRun({
        persona: "oneliner",
        label: "The one-line gotcha",
        metrics: {
          agentTurns: 1,
          agentAvgChars: 0,
          agentAvgWords: 100,
          hookViolations: 0,
          trailingQuestions: 0,
          multiQuestionTurns: 0,
        },
      }),
    ];
    const s = aggregateStats(runs);
    expect(s.runs).toBe(2);
    expect(s.agentTurns).toBe(5);
    expect(s.hookViolations).toBe(2);
    expect(s.multiQuestionTurns).toBe(1);
    // weighted: (50*4 + 100*1) / 5 = 60
    expect(s.avgAgentWords).toBe(60);
    expect(s.byPersona).toHaveLength(2);
  });

  it("handles an empty run set", () => {
    const s = aggregateStats([]);
    expect(s.runs).toBe(0);
    expect(s.avgAgentWords).toBe(0);
    expect(s.byPersona).toEqual([]);
  });
});

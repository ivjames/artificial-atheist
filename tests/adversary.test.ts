import { describe, expect, it } from "vitest";
import {
  PERSONAS,
  getPersona,
  personaNames,
  buildAdversaryPrompt,
  withDials,
  openerInstruction,
  scoreAgentTurns,
  metricsFromTranscript,
  ARGUMENTS,
  argumentKeys,
} from "@/lib/agent/adversary";
import {
  aggregateStats,
  runCostAvailable,
  runCostBoundUsd,
  runCostUsd,
  type ParsedRun,
} from "@/lib/adversaryRuns";

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
    expect(m.agentAvgSentences).toBe(0);
  });

  it("averages sentence length across replies", () => {
    // 2 sentences and 4 sentences → mean 3.
    const m = scoreAgentTurns(["One point. And a second.", "A. B. C. D."]);
    expect(m.agentAvgSentences).toBe(3);
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

  it("flags replies that sprawl past the sentence ceiling", () => {
    const wall = Array.from({ length: 12 }, (_, i) => `Point number ${i + 1}.`).join(" ");
    const tight = "Order looks designed. That inference is the weak link. It assumes what it sets out to prove.";
    const m = scoreAgentTurns([wall, tight]);
    expect(m.longReplies).toBe(1); // only the 12-sentence wall
    expect(m.agentTurns).toBe(2);
  });

  it("does not flag a reply that lands within the ceiling", () => {
    // Exactly ten sentences is at the top of the persona's stated range, not over it.
    const tenSentences = Array.from({ length: 10 }, (_, i) => `Claim ${i + 1}.`).join(" ");
    const m = scoreAgentTurns([tenSentences]);
    expect(m.longReplies).toBe(0);
  });
});

describe("metricsFromTranscript", () => {
  it("scores only the agent's replies, ignoring the adversary's turns", () => {
    const transcript = [
      { speaker: "adversary", content: "Why is there something rather than nothing? Answer me." },
      { speaker: "agent", content: "That question assumes a cause. It doesn't have one." },
      { speaker: "agent", content: "A. B. C. D. E. F. G. H. I. J. K." }, // 11 sentences → over-length
    ];
    const m = metricsFromTranscript(transcript);
    expect(m.agentTurns).toBe(2); // adversary line excluded
    expect(m.longReplies).toBe(1); // the 11-sentence agent reply
    expect(m.agentAvgSentences).toBeGreaterThan(0);
  });

  it("equals scoreAgentTurns over the agent lines (same computation)", () => {
    const transcript = [
      { speaker: "agent", content: "One point. And a second." },
      { speaker: "adversary", content: "Rebuttal here." },
      { speaker: "agent", content: "A closing thought." },
    ];
    expect(metricsFromTranscript(transcript)).toEqual(
      scoreAgentTurns(["One point. And a second.", "A closing thought."]),
    );
  });

  it("returns empty metrics when the transcript has no agent turns", () => {
    const m = metricsFromTranscript([{ speaker: "adversary", content: "Only me here." }]);
    expect(m.agentTurns).toBe(0);
    expect(m.agentAvgSentences).toBe(0);
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
        agentAvgSentences: 3,
        hookViolations: 1,
        trailingQuestions: 1,
        multiQuestionTurns: 0,
        longReplies: 0,
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
          agentAvgSentences: 4,
          hookViolations: 2,
          trailingQuestions: 0,
          multiQuestionTurns: 1,
          longReplies: 3,
        },
      }),
      mkRun({
        persona: "oneliner",
        label: "The one-line gotcha",
        metrics: {
          agentTurns: 1,
          agentAvgChars: 0,
          agentAvgWords: 100,
          agentAvgSentences: 9,
          hookViolations: 0,
          trailingQuestions: 0,
          multiQuestionTurns: 0,
          longReplies: 1,
        },
      }),
    ];
    const s = aggregateStats(runs);
    expect(s.runs).toBe(2);
    expect(s.agentTurns).toBe(5);
    expect(s.hookViolations).toBe(2);
    expect(s.multiQuestionTurns).toBe(1);
    expect(s.longReplies).toBe(4);
    // weighted: (50*4 + 100*1) / 5 = 60
    expect(s.avgAgentWords).toBe(60);
    // weighted sentences: (4*4 + 9*1) / 5 = 5
    expect(s.avgAgentSentences).toBe(5);
    expect(s.byPersona).toHaveLength(2);
  });

  it("treats a stored run missing longReplies/agentAvgSentences as zero (older rows)", () => {
    // Runs saved before these metrics existed have no `longReplies` or
    // `agentAvgSentences` key in their JSON blob. The roll-up must coalesce
    // them, not add undefined (which would poison the weighted mean with NaN).
    const legacyMetrics = {
      agentTurns: 2,
      agentAvgChars: 0,
      agentAvgWords: 30,
      hookViolations: 0,
      trailingQuestions: 0,
      multiQuestionTurns: 0,
    } as ParsedRun["metrics"]; // deliberately omits longReplies + agentAvgSentences
    const s = aggregateStats([mkRun({ metrics: legacyMetrics })]);
    expect(s.longReplies).toBe(0);
    expect(s.byPersona[0].longReplies).toBe(0);
    expect(s.avgAgentSentences).toBe(0);
    expect(s.byPersona[0].avgAgentSentences).toBe(0);
  });

  it("handles an empty run set", () => {
    const s = aggregateStats([]);
    expect(s.runs).toBe(0);
    expect(s.avgAgentWords).toBe(0);
    expect(s.byPersona).toEqual([]);
    expect(s.costUnavailableRuns).toBe(0);
  });

  it("excludes uncostable runs from the total and counts them instead", () => {
    const costable = mkRun({
      persona: "professor",
      tier: "standard",
      transcript: [{ speaker: "agent", content: "", inTok: 1000, outTok: 100 }],
    });
    // Backfilled shape: real totals on the row, no per-line split in the body.
    const backfilled = mkRun({
      persona: "zealot",
      inputTokens: 5000,
      outputTokens: 800,
      transcript: [{ speaker: "agent", content: "hi", inTok: 0, outTok: 0 }],
    });
    const s = aggregateStats([costable, backfilled]);
    expect(s.costUnavailableRuns).toBe(1);
    // costUsd stays the EXACT figure — the backfilled run adds nothing to it
    // rather than adding a fabricated number.
    expect(s.costUsd).toBeCloseTo(runCostUsd(costable), 6);
    // The corpus bracket does include it, as a floor and ceiling.
    const b = runCostBoundUsd(backfilled);
    expect(s.costMinUsd).toBeCloseTo(s.costUsd + b.min, 6);
    expect(s.costMaxUsd).toBeCloseTo(s.costUsd + b.max, 6);
    expect(s.costMinUsd).toBeLessThan(s.costMaxUsd);
    // Its tokens still count — those numbers ARE recoverable from the file.
    expect(s.inputTokens).toBe(costable.inputTokens + 5000);
  });

  it("collapses the bracket to the exact total when nothing was backfilled", () => {
    const s = aggregateStats([
      mkRun({ transcript: [{ speaker: "agent", content: "", inTok: 100, outTok: 10 }] }),
    ]);
    expect(s.costUnavailableRuns).toBe(0);
    expect(s.costMinUsd).toBeCloseTo(s.costUsd, 9);
    expect(s.costMaxUsd).toBeCloseTo(s.costUsd, 9);
  });
});

describe("runCostBoundUsd", () => {
  // standard tier → agent on Haiku 4.5 ($1/$5); adversary on Sonnet 4.5 ($3/$15).
  const run = mkRun({
    tier: "standard",
    adversaryModel: "anthropic:claude-sonnet-4-5",
    inputTokens: 10_000,
    outputTokens: 2_000,
    transcript: [{ speaker: "agent", content: "x", inTok: 0, outTok: 0 }],
  });

  it("brackets input and output independently at each model's rate", () => {
    const b = runCostBoundUsd(run);
    // floor: all Haiku  → 10000*1 + 2000*5  = 20000 → $0.0200
    // ceil:  all Sonnet → 10000*3 + 2000*15 = 60000 → $0.0600
    expect(b.min).toBeCloseTo(0.02, 6);
    expect(b.max).toBeCloseTo(0.06, 6);
  });

  it("contains the exact cost of any possible split", () => {
    const b = runCostBoundUsd(run);
    // Whatever the real split was, costing it lands inside the bracket. Check
    // the extremes plus a middle split — the bound is only useful if true.
    for (const agentShare of [0, 0.5, 1]) {
      const agIn = 10_000 * agentShare;
      const agOut = 2_000 * agentShare;
      const exact = runCostUsd(
        mkRun({
          tier: "standard",
          adversaryModel: "anthropic:claude-sonnet-4-5",
          transcript: [
            { speaker: "agent", content: "", inTok: agIn, outTok: agOut },
            { speaker: "adversary", content: "", inTok: 10_000 - agIn, outTok: 2_000 - agOut },
          ],
        }),
      );
      expect(exact).toBeGreaterThanOrEqual(b.min - 1e-9);
      expect(exact).toBeLessThanOrEqual(b.max + 1e-9);
    }
  });

  it("collapses to a point when both sides ran the same model", () => {
    const same = mkRun({
      tier: "premium", // agent on Sonnet
      adversaryModel: "anthropic:claude-sonnet-4-5",
      inputTokens: 1_000,
      outputTokens: 100,
      transcript: [{ speaker: "agent", content: "x", inTok: 0, outTok: 0 }],
    });
    const b = runCostBoundUsd(same);
    expect(b.min).toBeCloseTo(b.max, 9);
  });
});

describe("runCostAvailable", () => {
  it("is true for a run whose transcript carries per-line tokens", () => {
    expect(
      runCostAvailable(
        mkRun({ transcript: [{ speaker: "agent", content: "", inTok: 10, outTok: 2 }] }),
      ),
    ).toBe(true);
  });

  it("is false when the row spent tokens but the per-line split is missing", () => {
    expect(
      runCostAvailable(
        mkRun({
          inputTokens: 900,
          outputTokens: 100,
          transcript: [{ speaker: "agent", content: "x", inTok: 0, outTok: 0 }],
        }),
      ),
    ).toBe(false);
  });

  it("is true for a genuinely free run — zeros everywhere are not a gap", () => {
    expect(
      runCostAvailable(
        mkRun({
          inputTokens: 0,
          outputTokens: 0,
          transcript: [{ speaker: "agent", content: "x", inTok: 0, outTok: 0 }],
        }),
      ),
    ).toBe(true);
  });

  it("is false for an empty transcript — nothing to attribute tokens to", () => {
    expect(runCostAvailable(mkRun({}))).toBe(false);
  });
});

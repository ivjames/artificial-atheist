// Read model + aggregation for adversarial eval runs (persisted by
// scripts/adversary.ts). Consumed by the admin review surface at
// /review/adversary. The DB stores `transcript` and `metrics` as JSON strings;
// this module parses them and rolls a set of runs up into review stats.
import { prisma } from "@/lib/prisma";
import type { AdversaryRun } from "@prisma/client";
import {
  emptyAgentMetrics,
  type AgentMetrics,
} from "@/lib/agent/adversary";
import { modelForSlot } from "@/lib/models/router";
import { modelCostUsd } from "@/lib/pricing";

export type TranscriptLine = {
  speaker: "adversary" | "agent";
  content: string;
  inTok: number;
  outTok: number;
};

export type ParsedRun = Omit<AdversaryRun, "transcript" | "metrics"> & {
  transcript: TranscriptLine[];
  metrics: AgentMetrics;
};

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parseRun(run: AdversaryRun): ParsedRun {
  return {
    ...run,
    transcript: safeJson<TranscriptLine[]>(run.transcript, []),
    metrics: safeJson<AgentMetrics>(run.metrics, emptyAgentMetrics()),
  };
}

/**
 * Whether a real per-run cost can be computed.
 *
 * Costing splits tokens by speaker so each side prices at its own model's
 * rate, which needs PER-LINE token counts. Runs backfilled from a markdown
 * transcript only preserve the totals — the file never stored the split — so
 * they carry per-line zeros against a non-zero row total. Detecting that shape
 * needs no schema column and no guessing.
 *
 * These runs report no cost rather than a fabricated one: distributing the
 * totals across lines by length would invent a number, and "$0.00" would be a
 * false statement about a run that really did cost money.
 */
export function runCostAvailable(run: ParsedRun): boolean {
  if (run.transcript.length === 0) return false;
  const perLine = run.transcript.reduce((s, l) => s + l.inTok + l.outTok, 0);
  const rowTotal = run.inputTokens + run.outputTokens;
  return perLine > 0 || rowTotal === 0;
}

// Real provider cost of a run in USD. The run stores COMBINED tokens, so we
// split them back out via the transcript (each line carries its speaker +
// tokens) and cost each side at its own model's rate: the agent ran on the
// tier's slot model, the apologist on run.adversaryModel (stored as
// "provider:model"). Same method the CLI uses at report time (lib/pricing.ts).
export function runCostUsd(run: ParsedRun): number {
  const agentModel = modelForSlot(run.tier === "premium" ? "premium" : "standard").model;
  const advModel = run.adversaryModel.includes(":")
    ? run.adversaryModel.slice(run.adversaryModel.indexOf(":") + 1)
    : run.adversaryModel;

  let agIn = 0, agOut = 0, advIn = 0, advOut = 0;
  for (const l of run.transcript) {
    if (l.speaker === "agent") {
      agIn += l.inTok;
      agOut += l.outTok;
    } else {
      advIn += l.inTok;
      advOut += l.outTok;
    }
  }
  return modelCostUsd(agentModel, agIn, agOut) + modelCostUsd(advModel, advIn, advOut);
}

export async function listRuns(limit = 200): Promise<ParsedRun[]> {
  const rows = await prisma.adversaryRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(parseRun);
}

export type PersonaStat = {
  persona: string;
  label: string;
  runs: number;
  agentTurns: number;
  avgAgentWords: number;
  hookViolations: number;
  multiQuestionTurns: number;
};

export type AggregateStats = {
  runs: number;
  agentTurns: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number; // real provider cost across runs that can be costed
  // Runs excluded from costUsd because their per-line token split wasn't
  // preserved (backfilled from a transcript). Surfaced so the total is never
  // silently understated.
  costUnavailableRuns: number;
  avgAgentWords: number;
  hookViolations: number;
  trailingQuestions: number;
  multiQuestionTurns: number;
  byPersona: PersonaStat[];
};

// Roll a set of parsed runs up into the numbers the review page shows. Averages
// over agent replies are weighted by the number of agent turns, so a 6-round
// run counts more than a 1-round run.
export function aggregateStats(runs: ParsedRun[]): AggregateStats {
  const agg: AggregateStats = {
    runs: runs.length,
    agentTurns: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    costUnavailableRuns: 0,
    avgAgentWords: 0,
    hookViolations: 0,
    trailingQuestions: 0,
    multiQuestionTurns: 0,
    byPersona: [],
  };

  let weightedWords = 0;
  const byPersona = new Map<string, PersonaStat & { weightedWords: number }>();

  for (const r of runs) {
    const m = r.metrics;
    agg.agentTurns += m.agentTurns;
    agg.inputTokens += r.inputTokens;
    agg.outputTokens += r.outputTokens;
    if (runCostAvailable(r)) agg.costUsd += runCostUsd(r);
    else agg.costUnavailableRuns += 1;
    agg.hookViolations += m.hookViolations;
    agg.trailingQuestions += m.trailingQuestions;
    agg.multiQuestionTurns += m.multiQuestionTurns;
    weightedWords += m.agentAvgWords * m.agentTurns;

    const p = byPersona.get(r.persona) ?? {
      persona: r.persona,
      label: r.label,
      runs: 0,
      agentTurns: 0,
      avgAgentWords: 0,
      hookViolations: 0,
      multiQuestionTurns: 0,
      weightedWords: 0,
    };
    p.runs += 1;
    p.agentTurns += m.agentTurns;
    p.hookViolations += m.hookViolations;
    p.multiQuestionTurns += m.multiQuestionTurns;
    p.weightedWords += m.agentAvgWords * m.agentTurns;
    byPersona.set(r.persona, p);
  }

  agg.avgAgentWords = agg.agentTurns ? Math.round(weightedWords / agg.agentTurns) : 0;
  agg.byPersona = [...byPersona.values()]
    .map((p) => ({
      persona: p.persona,
      label: p.label,
      runs: p.runs,
      agentTurns: p.agentTurns,
      avgAgentWords: p.agentTurns ? Math.round(p.weightedWords / p.agentTurns) : 0,
      hookViolations: p.hookViolations,
      multiQuestionTurns: p.multiQuestionTurns,
    }))
    .sort((a, b) => b.runs - a.runs || a.persona.localeCompare(b.persona));

  return agg;
}

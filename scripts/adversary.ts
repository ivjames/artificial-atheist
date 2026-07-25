// adversary.ts — self-play eval harness for the debate agent.
//
// Pits a simulated apologist (lib/agent/adversary.ts) against the REAL debate
// agent (lib/agent/persona.ts + lib/models/router.ts) for N rounds and writes a
// readable transcript to drafts/adversary/. Use it to see how the agent holds
// up against believers of varying sophistication and style.
//
// This never touches the DB, credits, or the live chat path — it exercises the
// debate agent's persona + model routing directly. (The per-turn article
// "reference library" that the live chat injects is intentionally left out so
// the harness runs anywhere without Postgres.)
//
// Run:
//   npm run adversary -- --persona professor            # one persona, real Claude
//   npm run adversary -- --persona all --turns 4        # every persona
//   npm run adversary -- --persona seeker --tier premium
//   npm run adversary -- --persona everyman --sophistication 1 --hostility sneering
//   npm run adversary -- --persona oneliner --seed "the moral argument"
//   npm run adversary -- --persona professor --mock      # no API calls, wiring check
//
// Real Claude is the default. The adversary model is env-driven:
//   ADVERSARY_PROVIDER (default "anthropic"), ADVERSARY_MODEL (default
//   "claude-sonnet-4-5"). The debate agent uses whatever the standard/premium
//   slot resolves to in lib/config.ts.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { providerFor } from "@/lib/models/router";
import { callSlot } from "@/lib/models/router";
import type { ChatRole, ChatTurn } from "@/lib/models/types";
import { DEBATE_SYSTEM_PROMPT } from "@/lib/agent/persona";
import {
  PERSONAS,
  getPersona,
  buildAdversaryPrompt,
  withDials,
  openerInstruction,
  scoreAgentTurns,
  ARGUMENTS,
  type AdversaryPersona,
  type AdversaryDials,
  type AgentMetrics,
  type Sophistication,
  type Verbosity,
  type Hostility,
  type ArgumentFocus,
} from "@/lib/agent/adversary";
import { prisma } from "@/lib/prisma";
import { maxOutputTokens } from "@/lib/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "drafts", "adversary");

type Speaker = "adversary" | "agent";
type Line = { speaker: Speaker; content: string; inTok: number; outTok: number };

type Options = {
  personaName: string; // persona id or "all"
  turns: number; // rounds (one adversary + one agent = a round)
  tier: "standard" | "premium";
  mock: boolean;
  noDb: boolean; // skip persisting to the DB (transcript file still written)
  seed?: string;
  dials: Partial<AdversaryDials>;
};

// --- arg parsing -----------------------------------------------------------

const VERBOSITIES: Verbosity[] = ["terse", "short", "medium", "long", "rambling"];
const HOSTILITIES: Hostility[] = ["warm", "civil", "pointed", "combative", "sneering"];

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    personaName: "professor",
    turns: 4,
    tier: "standard",
    mock: false,
    noDb: false,
    dials: {},
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--persona":
      case "-p":
        opts.personaName = next();
        break;
      case "--turns":
      case "-t":
        opts.turns = Math.max(1, parseInt(next(), 10) || 4);
        break;
      case "--tier":
        opts.tier = next() === "premium" ? "premium" : "standard";
        break;
      case "--mock":
        opts.mock = true;
        break;
      case "--no-db":
        opts.noDb = true;
        break;
      case "--seed":
        opts.seed = next();
        break;
      case "--sophistication":
      case "-s": {
        const n = parseInt(next(), 10);
        if (n >= 1 && n <= 5) opts.dials.sophistication = n as Sophistication;
        break;
      }
      case "--verbosity": {
        const v = next() as Verbosity;
        if (VERBOSITIES.includes(v)) opts.dials.verbosity = v;
        break;
      }
      case "--hostility": {
        const h = next() as Hostility;
        if (HOSTILITIES.includes(h)) opts.dials.hostility = h;
        break;
      }
      case "--argument":
      case "--focus": {
        const f = next() as ArgumentFocus;
        if (f === "mixed" || f in ARGUMENTS) opts.dials.focus = f;
        break;
      }
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith("-")) {
          console.error(`Unknown flag: ${a}`);
          printHelp();
          process.exit(1);
        }
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`adversary — self-play eval harness for the debate agent

Usage: npm run adversary -- [options]

  -p, --persona <name|all>   persona to run (default: professor)
  -t, --turns <n>            rounds to run (default: 4)
      --tier <standard|premium>
      --seed "<text>"        pin the opening argument
  -s, --sophistication <1-5> override reasoning level
      --verbosity <${VERBOSITIES.join("|")}>
      --hostility <${HOSTILITIES.join("|")}>
      --argument <key|mixed> override argument focus
      --mock                 no API calls (wiring check; skips DB write)
      --no-db                don't persist to the DB (transcript file only)
  -h, --help

Personas: ${PERSONAS.map((p) => p.name).join(", ")}
Arguments: ${Object.keys(ARGUMENTS).join(", ")}, mixed`);
}

// --- role mapping ----------------------------------------------------------
// The two sides see the same conversation with roles swapped. Anthropic
// requires the message list to start with a user turn and alternate, so the
// adversary's view is prefixed with the opener instruction as its first user
// message (the transcript strictly alternates, so this keeps both views valid).

function agentView(lines: Line[]): ChatTurn[] {
  return lines.map((l) => ({
    role: (l.speaker === "adversary" ? "user" : "assistant") as ChatRole,
    content: l.content,
  }));
}

function adversaryView(lines: Line[], opener: string): ChatTurn[] {
  return [
    { role: "user" as ChatRole, content: opener },
    ...lines.map((l) => ({
      role: (l.speaker === "adversary" ? "assistant" : "user") as ChatRole,
      content: l.content,
    })),
  ];
}

// --- model calls -----------------------------------------------------------

const ADVERSARY_PROVIDER = process.env.ADVERSARY_PROVIDER || "anthropic";
const ADVERSARY_MODEL = process.env.ADVERSARY_MODEL || "claude-sonnet-4-5";

async function callAdversary(
  system: string,
  messages: ChatTurn[],
): Promise<{ text: string; inTok: number; outTok: number }> {
  const res = await providerFor(ADVERSARY_PROVIDER).complete(ADVERSARY_MODEL, {
    system,
    messages,
    maxTokens: maxOutputTokens,
    temperature: 0.9, // more variety on the adversary side
  });
  return { text: res.text, inTok: res.inputTokens, outTok: res.outputTokens };
}

async function callAgent(
  tier: "standard" | "premium",
  messages: ChatTurn[],
): Promise<{ text: string; inTok: number; outTok: number }> {
  const res = await callSlot(tier, {
    system: DEBATE_SYSTEM_PROMPT,
    messages,
    maxTokens: maxOutputTokens,
  });
  return { text: res.text, inTok: res.inputTokens, outTok: res.outputTokens };
}

// Mock mode: deterministic canned turns so the harness (arg parsing, role
// mapping, transcript writing) can be exercised with no API key or spend.
function mockAdversary(persona: AdversaryPersona, round: number): string {
  const focus = persona.dials.focus;
  const keys = focus === "mixed" ? (Object.keys(ARGUMENTS) as (keyof typeof ARGUMENTS)[]) : [focus];
  const key = keys[round % keys.length];
  return `[mock ${persona.name}] ${ARGUMENTS[key].opener}`;
}

function mockAgent(round: number): string {
  return `[mock agent] Point ${round + 1}: that argument smuggles in its conclusion. Show me the evidence, not the syllogism.`;
}

// --- one conversation ------------------------------------------------------

async function runConversation(
  persona: AdversaryPersona,
  opts: Options,
): Promise<Line[]> {
  const system = buildAdversaryPrompt(persona);
  const opener = openerInstruction(opts.seed);
  const lines: Line[] = [];

  for (let round = 0; round < opts.turns; round++) {
    // Adversary turn.
    if (opts.mock) {
      lines.push({
        speaker: "adversary",
        content: mockAdversary(persona, round),
        inTok: 0,
        outTok: 0,
      });
    } else {
      const adv = await callAdversary(system, adversaryView(lines, opener));
      lines.push({
        speaker: "adversary",
        content: adv.text,
        inTok: adv.inTok,
        outTok: adv.outTok,
      });
    }
    process.stdout.write(`  round ${round + 1}: adversary… `);

    // Agent turn.
    if (opts.mock) {
      lines.push({ speaker: "agent", content: mockAgent(round), inTok: 0, outTok: 0 });
    } else {
      const agent = await callAgent(opts.tier, agentView(lines));
      lines.push({
        speaker: "agent",
        content: agent.text,
        inTok: agent.inTok,
        outTok: agent.outTok,
      });
    }
    process.stdout.write(`agent ✓\n`);
  }
  return lines;
}

// --- transcript output -----------------------------------------------------

const stamp = () =>
  new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

// Score the agent's side of a finished conversation.
function agentMetrics(lines: Line[]): AgentMetrics {
  return scoreAgentTurns(
    lines.filter((l) => l.speaker === "agent").map((l) => l.content),
  );
}

function writeTranscript(
  persona: AdversaryPersona,
  opts: Options,
  lines: Line[],
  metrics: AgentMetrics,
  runStamp: string,
): { file: string; inTok: number; outTok: number } {
  const d = persona.dials;
  const inTok = lines.reduce((s, l) => s + l.inTok, 0);
  const outTok = lines.reduce((s, l) => s + l.outTok, 0);

  const body = lines
    .map((l) => {
      const who = l.speaker === "adversary" ? `APOLOGIST (${persona.name})` : "DEBATE AGENT";
      return `### ${who}\n\n${l.content}`;
    })
    .join("\n\n");

  const md = `---
persona: ${persona.name}
label: "${persona.label}"
tier: ${opts.tier}
adversary_model: ${opts.mock ? "mock" : `${ADVERSARY_PROVIDER}:${ADVERSARY_MODEL}`}
sophistication: ${d.sophistication}
verbosity: ${d.verbosity}
hostility: ${d.hostility}
focus: ${d.focus}
turns: ${opts.turns}
${opts.seed ? `seed: "${opts.seed.replace(/"/g, "'")}"\n` : ""}input_tokens: ${inTok}
output_tokens: ${outTok}
agent_avg_words: ${metrics.agentAvgWords}
hook_violations: ${metrics.hookViolations}
trailing_questions: ${metrics.trailingQuestions}
multi_question_turns: ${metrics.multiQuestionTurns}
run: ${runStamp}
---

# Adversary eval — ${persona.label} vs debate agent

${body}
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${runStamp}-${persona.name}.md`);
  fs.writeFileSync(file, md, "utf8");
  return { file, inTok, outTok };
}

// Persist a finished run so it shows up at /review/adversary. Best-effort: the
// DB only lives on the droplet, so a run from a machine that can't reach it
// (or a --no-db / --mock run) just skips this — the transcript file is always
// written regardless.
async function persistRun(
  persona: AdversaryPersona,
  opts: Options,
  lines: Line[],
  metrics: AgentMetrics,
  runStamp: string,
): Promise<void> {
  const d = persona.dials;
  const inTok = lines.reduce((s, l) => s + l.inTok, 0);
  const outTok = lines.reduce((s, l) => s + l.outTok, 0);
  await prisma.adversaryRun.create({
    data: {
      persona: persona.name,
      label: persona.label,
      tier: opts.tier,
      adversaryModel: `${ADVERSARY_PROVIDER}:${ADVERSARY_MODEL}`,
      sophistication: d.sophistication,
      verbosity: d.verbosity,
      hostility: d.hostility,
      focus: d.focus,
      turns: opts.turns,
      seed: opts.seed ?? null,
      inputTokens: inTok,
      outputTokens: outTok,
      transcript: JSON.stringify(lines),
      metrics: JSON.stringify(metrics),
      runStamp,
    },
  });
}

// --- main ------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.mock && ADVERSARY_PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Set it, or pass --mock for an offline wiring check.",
    );
    process.exit(1);
  }

  let personas: AdversaryPersona[];
  if (opts.personaName === "all") {
    personas = PERSONAS;
  } else {
    const base = getPersona(opts.personaName);
    if (!base) {
      console.error(`Unknown persona "${opts.personaName}". Options: ${PERSONAS.map((p) => p.name).join(", ")}, all`);
      process.exit(1);
    }
    personas = [base];
  }

  // Apply any CLI dial overrides on top of each persona.
  personas = personas.map((p) => withDials(p, opts.dials));

  const runStamp = stamp();
  console.log(
    `Adversary eval — ${personas.length} persona(s), ${opts.turns} rounds, tier=${opts.tier}, model=${opts.mock ? "mock" : `${ADVERSARY_PROVIDER}:${ADVERSARY_MODEL}`}\n`,
  );

  let totalIn = 0;
  let totalOut = 0;
  const written: string[] = [];

  for (const persona of personas) {
    console.log(`▶ ${persona.name} — ${persona.label} (soph ${persona.dials.sophistication}, ${persona.dials.verbosity}, ${persona.dials.hostility}, ${persona.dials.focus})`);
    try {
      const lines = await runConversation(persona, opts);
      const metrics = agentMetrics(lines);
      const { file, inTok, outTok } = writeTranscript(persona, opts, lines, metrics, runStamp);
      totalIn += inTok;
      totalOut += outTok;
      written.push(file);

      // Persist for the /review/adversary surface (best-effort; not in mock).
      let saved = "";
      if (!opts.mock && !opts.noDb) {
        try {
          await persistRun(persona, opts, lines, metrics, runStamp);
          saved = ", saved to DB";
        } catch (e) {
          saved = `, DB save skipped (${(e as Error).message})`;
        }
      }

      console.log(
        `  → drafts/adversary/${path.basename(file)}  (${inTok} in / ${outTok} out tokens; ${metrics.hookViolations} hook, ${metrics.multiQuestionTurns} multi-Q${saved})\n`,
      );
    } catch (e) {
      console.error(`  FAILED: ${(e as Error).message}\n`);
    }
  }

  console.log(`Done. ${written.length} transcript(s) in drafts/adversary/.`);
  if (!opts.mock && !opts.noDb) {
    console.log(`Review them at /review/adversary (admin-gated).`);
  }
  if (!opts.mock) {
    console.log(`Tokens across the run: ${totalIn} in / ${totalOut} out (both sides).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

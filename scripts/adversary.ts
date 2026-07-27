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
//   "claude-sonnet-4-5"), ADVERSARY_MAX_TOKENS (default 3000 — the apologist's
//   own output cap, decoupled from the agent's so a rambling persona isn't
//   truncated mid-turn). The debate agent uses whatever the standard/premium
//   slot resolves to in lib/config.ts, capped at maxOutputTokens.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { providerFor } from "@/lib/models/router";
import { callSlot, modelForSlot } from "@/lib/models/router";
import { modelCostUsd } from "@/lib/pricing";
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
  // How many independent runs to execute at once. A single conversation is
  // inherently sequential — the agent answers the apologist and vice versa — so
  // this parallelizes ACROSS runs, i.e. whenever an invocation produces more
  // than one: `--persona all`, `--argument all` (one run per argument), or both
  // (their product). The sweep expands `personas` before the pool dispatches
  // it, so pinned-persona argument sweeps parallelize too. Keep it modest: each
  // round fires 2 model calls, so N concurrent runs means up to 2N in flight,
  // which can hit Anthropic rate limits.
  concurrency: number;
  seed?: string;
  dials: Partial<AdversaryDials>;
  // `--argument all`: run each selected persona once per argument in the
  // catalog (anchor swept across the whole catalog) instead of a single run on
  // its default focus. Lets pinned personas cover every opening argument.
  sweep: boolean;
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
    concurrency: 1,
    dials: {},
    sweep: false,
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
      case "--concurrency":
      case "-c":
        opts.concurrency = Math.max(1, parseInt(next(), 10) || 1);
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
        const f = next();
        if (f === "all") opts.sweep = true;
        else if (f === "mixed" || f in ARGUMENTS) opts.dials.focus = f as ArgumentFocus;
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
  -c, --concurrency <n>      independent runs in parallel (default: 1; helps
                             --persona all and/or --argument all — watch rate limits)
      --tier <standard|premium>
      --seed "<text>"        pin the opening argument
  -s, --sophistication <1-5> override reasoning level
      --verbosity <${VERBOSITIES.join("|")}>
      --hostility <${HOSTILITIES.join("|")}>
      --argument <key|mixed|all> override argument focus; "all" sweeps every
                             argument in the catalog (one run per key, per persona)
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

// The adversary is a test fixture, not the product, so it isn't bound to the
// debate agent's output cap (maxOutputTokens). A rambling / Gish-gallop persona
// can run long, and truncating its turn mid-sentence both chops the transcript
// and hands the agent a malformed prompt. Give it its own, roomier cap
// (env ADVERSARY_MAX_TOKENS) so the apologist is never the side that's cut.
const ADVERSARY_MAX_TOKENS = (() => {
  const raw = process.env.ADVERSARY_MAX_TOKENS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 3000;
})();

async function callAdversary(
  system: string,
  messages: ChatTurn[],
): Promise<{ text: string; inTok: number; outTok: number }> {
  const res = await providerFor(ADVERSARY_PROVIDER).complete(ADVERSARY_MODEL, {
    system,
    messages,
    maxTokens: ADVERSARY_MAX_TOKENS,
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
  quiet: boolean,
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
    if (!quiet) process.stdout.write(`  round ${round + 1}: adversary… `);

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
    if (!quiet) process.stdout.write(`agent ✓\n`);
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
agent_avg_sentences: ${metrics.agentAvgSentences}
hook_violations: ${metrics.hookViolations}
trailing_questions: ${metrics.trailingQuestions}
multi_question_turns: ${metrics.multiQuestionTurns}
long_replies: ${metrics.longReplies}
run: ${runStamp}
---

# Adversary eval — ${persona.label} vs debate agent

${body}
`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Sanitize the persona name for the filename — sweep variants carry a ":arg"
  // suffix that isn't safe across filesystems.
  const safeName = persona.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const file = path.join(OUT_DIR, `${runStamp}-${safeName}.md`);
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

// --- concurrency -----------------------------------------------------------

// Token tallies keyed by the model that produced them, so cost can be computed
// per model (the two sides usually run on different-priced models).
type Tally = { in: number; out: number };
type ModelTallies = Record<string, Tally>;
type PersonaResult = {
  ok: boolean;
  name: string;
  file?: string;
  inTok: number;
  outTok: number;
  byModel: ModelTallies;
  // Whether this run made it into the DB. "skipped" = persistence was off
  // (--mock/--no-db) or the conversation failed before we tried; "failed" =
  // the DB write threw. main() rolls these up into a saved/failed tally so a
  // run never "vanishes" from /review/adversary without a visible reason.
  saveStatus: "saved" | "skipped" | "failed";
  saveError?: string;
};

function addTally(into: ModelTallies, model: string, inTok: number, outTok: number): void {
  const t = (into[model] ??= { in: 0, out: 0 });
  t.in += inTok;
  t.out += outTok;
}

// Run one persona end to end: converse, score, write the transcript, persist.
// `quiet` suppresses per-round progress (used when several run in parallel, so
// their output doesn't interleave into noise — one summary line each instead).
async function runPersona(
  persona: AdversaryPersona,
  opts: Options,
  runStamp: string,
  quiet: boolean,
): Promise<PersonaResult> {
  const dial = `soph ${persona.dials.sophistication}, ${persona.dials.verbosity}, ${persona.dials.hostility}, ${persona.dials.focus}`;
  console.log(`▶ ${persona.name} — ${persona.label} (${dial})`);
  try {
    const lines = await runConversation(persona, opts, quiet);
    const metrics = agentMetrics(lines);
    const { file, inTok, outTok } = writeTranscript(persona, opts, lines, metrics, runStamp);

    // Attribute each turn's tokens to the model that produced it: the agent
    // side runs on the tier's slot model, the apologist on ADVERSARY_MODEL.
    const agentModel = modelForSlot(opts.tier).model;
    const byModel: ModelTallies = {};
    for (const l of lines) {
      addTally(byModel, l.speaker === "agent" ? agentModel : ADVERSARY_MODEL, l.inTok, l.outTok);
    }

    // Persist for the /review/adversary surface. The outcome is returned (not
    // swallowed into a log line) so main() can print a saved/failed tally — a
    // silently-skipped DB write was how runs "vanished" from the review page.
    let saveStatus: PersonaResult["saveStatus"] = "skipped";
    let saveError: string | undefined;
    let savedNote = "";
    if (!opts.mock && !opts.noDb) {
      try {
        await persistRun(persona, opts, lines, metrics, runStamp);
        saveStatus = "saved";
        savedNote = ", saved to DB";
      } catch (e) {
        saveStatus = "failed";
        saveError = (e as Error).message;
        savedNote = `, DB SAVE FAILED (${saveError})`;
      }
    }

    console.log(
      `✓ ${persona.name} → drafts/adversary/${path.basename(file)}  (${inTok} in / ${outTok} out tokens; ${metrics.hookViolations} hook, ${metrics.multiQuestionTurns} multi-Q, ${metrics.longReplies} long${savedNote})`,
    );
    return { ok: true, name: persona.name, file, inTok, outTok, byModel, saveStatus, saveError };
  } catch (e) {
    console.error(`✗ ${persona.name} FAILED: ${(e as Error).message}`);
    return { ok: false, name: persona.name, inTok: 0, outTok: 0, byModel: {}, saveStatus: "skipped" };
  }
}

// Run fn over items with at most `limit` in flight at once, preserving the
// input order in the returned results.
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// --- main ------------------------------------------------------------------

// The DB the harness is actually connected to, as host[:port]/dbname with the
// credentials stripped. Printed alongside the row counts so a persistence
// "success" against a *different but reachable* database (the site's DB left
// untouched) is visible — connectivity alone isn't proof the writes land where
// the site reads. The operator compares this to the site's DATABASE_URL.
function dbTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "DATABASE_URL unset";
  try {
    const u = new URL(url);
    const port = u.port ? `:${u.port}` : "";
    const db = u.pathname.replace(/^\//, "") || "?";
    return `${u.hostname || "?"}${port}/${db}`;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

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

  // --argument all: sweep each selected persona across the whole ARGUMENTS
  // catalog — one run per key — so pinned personas cover every opening argument
  // instead of always anchoring on their default. Each variant is a distinct
  // persona (name/label suffixed with the argument) so transcripts don't
  // collide and the review page breaks coverage down per argument.
  if (opts.sweep) {
    const keys = Object.keys(ARGUMENTS) as (keyof typeof ARGUMENTS)[];
    personas = personas.flatMap((p) =>
      keys.map((k) =>
        withDials(
          { ...p, name: `${p.name}:${k}`, label: `${p.label} · ${ARGUMENTS[k].label}` },
          { focus: k },
        ),
      ),
    );
  }

  // Effective concurrency can't exceed the number of personas (one persona =
  // one sequential conversation, nothing to parallelize within it).
  const concurrency = Math.min(opts.concurrency, personas.length);

  const runStamp = stamp();
  console.log(
    `Adversary eval — ${personas.length} persona(s), ${opts.turns} rounds, tier=${opts.tier}, ` +
      `concurrency=${concurrency}, model=${opts.mock ? "mock" : `${ADVERSARY_PROVIDER}:${ADVERSARY_MODEL}`}\n`,
  );

  // Preflight the DB up front so a persistence problem is visible before we
  // spend on model calls. A run that can't reach the table would otherwise
  // write transcripts and silently save nothing — the usual cause of the
  // review page being "stuck" at N runs.
  if (opts.mock || opts.noDb) {
    console.log(
      `DB: persistence OFF (${opts.mock ? "--mock" : "--no-db"}) — transcripts only, nothing will be saved to /review/adversary.\n`,
    );
  } else {
    try {
      const existing = await prisma.adversaryRun.count();
      console.log(`DB: connected — ${dbTarget()} — ${existing} run(s) already stored.\n`);
    } catch (e) {
      // Abort before spending on model calls: the preflight exists precisely to
      // catch an unreachable DB / missing table before a full multi-persona run
      // pays for calls that can't persist. Deliberate --no-db/--mock runs never
      // reach here (they took the persistence-OFF branch above).
      console.error(
        `DB: preflight FAILED — ${(e as Error).message}\n` +
          `     Target: ${dbTarget()}\n` +
          `     Aborting before spending on model calls — nothing would persist to /review/adversary.\n` +
          `     Point DATABASE_URL at the same database the site reads and apply migrations\n` +
          `     (npm run db:deploy), or pass --no-db to run anyway (transcripts only).\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  const results = await mapPool(personas, concurrency, (persona) =>
    runPersona(persona, opts, runStamp, concurrency > 1),
  );

  const written = results.filter((r) => r.ok);
  const totalIn = results.reduce((s, r) => s + r.inTok, 0);
  const totalOut = results.reduce((s, r) => s + r.outTok, 0);

  console.log(`\nDone. ${written.length} transcript(s) in drafts/adversary/.`);

  // Report the DB outcome explicitly. "Review them at /review/adversary" only
  // prints when something actually saved — so a mock/no-db/failed run can't
  // masquerade as a successful one (which is how the page got stuck at 2).
  if (opts.mock || opts.noDb) {
    console.log(
      `Persistence was OFF (${opts.mock ? "--mock" : "--no-db"}); /review/adversary was not updated.`,
    );
  } else {
    const savedRuns = results.filter((r) => r.saveStatus === "saved");
    const failedRuns = results.filter((r) => r.saveStatus === "failed");
    let after: number | null = null;
    try {
      after = await prisma.adversaryRun.count();
    } catch {
      /* the failure is reported per-run below */
    }
    const nowHas = after != null ? ` — ${dbTarget()} now holds ${after} run(s)` : "";
    console.log(`DB: saved ${savedRuns.length}/${written.length} run(s)${nowHas}.`);
    if (failedRuns.length) {
      console.error(`DB: ${failedRuns.length} run(s) FAILED to save and are NOT on /review/adversary:`);
      for (const f of failedRuns) console.error(`  ✗ ${f.name}: ${f.saveError}`);
      console.error(
        `Fix the error above (commonly DATABASE_URL pointing at a different database than the\n` +
          `site reads, or missing migrations). The transcripts are already on disk, so once the\n` +
          `DB is reachable recover these runs with: npm run adversary:backfill`,
      );
      process.exitCode = 1;
    }
    if (savedRuns.length) console.log(`Review them at /review/adversary (admin-gated).`);
  }
  if (!opts.mock) {
    // Merge every persona's per-model tallies and cost each model at the
    // project's own list prices (lib/pricing.ts). The two sides usually run on
    // different-priced models, so the total is a sum of per-model costs — not
    // one blended rate. Caching gives no discount at this prompt size.
    const grand: ModelTallies = {};
    for (const r of results) {
      for (const [model, t] of Object.entries(r.byModel)) {
        addTally(grand, model, t.in, t.out);
      }
    }

    let totalCost = 0;
    const rows = Object.entries(grand)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([model, t]) => {
        const cost = modelCostUsd(model, t.in, t.out);
        totalCost += cost;
        return `    ${model.padEnd(20)} ${t.in} in / ${t.out} out   $${cost.toFixed(4)}`;
      });

    console.log(`Tokens across the run: ${totalIn} in / ${totalOut} out (both sides).`);
    console.log(`Cost: $${totalCost.toFixed(4)} (provider list prices; no cache discount at this prompt size)`);
    for (const row of rows) console.log(row);
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

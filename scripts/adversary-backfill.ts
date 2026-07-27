// Recover adversary eval runs that exist as transcripts but never reached the
// DB, so /review/adversary shows the whole history instead of whatever
// happened to persist.
//
//   npm run adversary:backfill -- --dry-run   # report what would be inserted
//   npm run adversary:backfill               # insert the missing runs
//
// Runs go missing for mundane reasons: the run predates the AdversaryRun
// migration, the DB was unreachable, someone hit "Clear all", or --no-db was
// passed. scripts/adversary.ts always writes the transcript first, so the
// markdown in drafts/adversary/ is the durable record and the DB is the
// derived one — which makes this direction of recovery possible at all.
//
// WHAT IS AND ISN'T RECOVERABLE: the front-matter carries persona, label,
// tier, adversary model, all four dials, turns, seed, token TOTALS, every
// metric, and the run stamp — so a backfilled row is faithful except for one
// thing: the per-line token split. The file never stored it. Costing needs it
// to price each speaker at its own model's rate, so backfilled runs report no
// cost rather than a fabricated one (see runCostAvailable in
// lib/adversaryRuns.ts). Distributing totals across lines by length would
// invent data, and a "$0.00" would be a false claim about a run that really
// did spend money.

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import matter from "gray-matter";

const OUT_DIR = path.join(process.cwd(), "drafts", "adversary");

type FrontMatter = {
  persona?: string;
  label?: string;
  tier?: string;
  adversary_model?: string;
  sophistication?: number;
  verbosity?: string;
  hostility?: string;
  focus?: string;
  turns?: number;
  seed?: string;
  input_tokens?: number;
  output_tokens?: number;
  agent_avg_words?: number;
  hook_violations?: number;
  trailing_questions?: number;
  multi_question_turns?: number;
  run?: string;
};

export type ParsedTranscript = {
  persona: string;
  label: string;
  tier: string;
  adversaryModel: string;
  sophistication: number;
  verbosity: string;
  hostility: string;
  focus: string;
  turns: number;
  seed: string | null;
  inputTokens: number;
  outputTokens: number;
  transcript: Array<{ speaker: "adversary" | "agent"; content: string; inTok: number; outTok: number }>;
  metrics: {
    agentTurns: number;
    agentAvgWords: number;
    hookViolations: number;
    trailingQuestions: number;
    multiQuestionTurns: number;
  };
  runStamp: string;
  createdAt: Date;
};

// Body sections are `### APOLOGIST (<persona>)` / `### DEBATE AGENT` followed by
// the reply. Per-line token counts were never written, hence the zeros — the
// row's totals stay truthful, and runCostAvailable() reads this shape to know
// the split is missing.
export function parseTranscriptBody(body: string): ParsedTranscript["transcript"] {
  const lines: ParsedTranscript["transcript"] = [];
  const parts = body.split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    if (nl < 0) continue;
    const heading = part.slice(0, nl).trim();
    const content = part.slice(nl + 1).trim();
    if (!content) continue;
    lines.push({
      speaker: /^APOLOGIST\b/i.test(heading) ? "adversary" : "agent",
      content,
      inTok: 0,
      outTok: 0,
    });
  }
  return lines;
}

// The stamp is `stamp()` in scripts/adversary.ts: a UTC ISO string with `:`
// and `.` replaced by `-` and `T` by `_`, i.e. `2026-07-25_21-05-33`. Reversing
// that recovers the run's real time, so backfilled runs sort into history where
// they belong instead of bunching at "now".
//
// Exported because getting this wrong is silent — a bad parse just yields
// plausible-looking mtimes.
export function createdAtFromStamp(runStamp: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/.exec(runStamp.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Falls back to the file's mtime when the stamp isn't parseable, rather than
// inventing "now".
function createdAtFor(runStamp: string, file: string): Date {
  const parsed = createdAtFromStamp(runStamp);
  if (parsed) return parsed;
  try {
    return fs.statSync(file).mtime;
  } catch {
    return new Date();
  }
}

export function parseTranscriptFile(
  file: string,
): ParsedTranscript | { error: string } | { skip: string } {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const fm = data as FrontMatter;

  const persona = fm.persona?.trim();
  const runStamp = fm.run?.toString().trim();
  if (!persona) return { error: "front-matter has no persona" };
  if (!runStamp) return { error: "front-matter has no run stamp" };

  // `--mock` transcripts are canned strings, not model output. scripts/
  // adversary.ts deliberately never persists them; backfilling them would pump
  // fake conversations into the aggregate the eval is judged on.
  if (fm.adversary_model?.toString().trim() === "mock") {
    return { skip: "mock run — not a real conversation" };
  }

  const transcript = parseTranscriptBody(content);
  if (transcript.length === 0) return { error: "no transcript turns found" };

  const agentTurns = transcript.filter((l) => l.speaker === "agent").length;

  return {
    persona,
    label: fm.label?.toString() ?? persona,
    tier: fm.tier?.toString() ?? "standard",
    adversaryModel: fm.adversary_model?.toString() ?? "unknown",
    sophistication: Number(fm.sophistication ?? 0) || 0,
    verbosity: fm.verbosity?.toString() ?? "",
    hostility: fm.hostility?.toString() ?? "",
    focus: fm.focus?.toString() ?? "",
    turns: Number(fm.turns ?? 0) || 0,
    seed: fm.seed?.toString() || null,
    inputTokens: Number(fm.input_tokens ?? 0) || 0,
    outputTokens: Number(fm.output_tokens ?? 0) || 0,
    transcript,
    metrics: {
      agentTurns,
      agentAvgWords: Number(fm.agent_avg_words ?? 0) || 0,
      hookViolations: Number(fm.hook_violations ?? 0) || 0,
      trailingQuestions: Number(fm.trailing_questions ?? 0) || 0,
      multiQuestionTurns: Number(fm.multi_question_turns ?? 0) || 0,
    },
    runStamp,
    createdAt: createdAtFor(runStamp, file),
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    if (!fs.existsSync(OUT_DIR)) {
      console.log(`No transcripts at ${OUT_DIR}. Nothing to backfill.`);
      return;
    }
    const files = fs
      .readdirSync(OUT_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => path.join(OUT_DIR, f));

    let inserted = 0;
    let already = 0;
    let skipped = 0;
    const problems: string[] = [];

    for (const file of files) {
      const name = path.basename(file);
      let parsed: ReturnType<typeof parseTranscriptFile>;
      try {
        parsed = parseTranscriptFile(file);
      } catch (e) {
        problems.push(`${name}: ${(e as Error).message}`);
        continue;
      }
      if ("error" in parsed) {
        problems.push(`${name}: ${parsed.error}`);
        continue;
      }
      if ("skip" in parsed) {
        skipped += 1;
        continue;
      }

      // Idempotent on (runStamp, persona) — the pair identifies one run, and
      // re-running after a partial backfill must not duplicate.
      const existing = await prisma.adversaryRun.findFirst({
        where: { runStamp: parsed.runStamp, persona: parsed.persona },
        select: { id: true },
      });
      if (existing) {
        already += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.adversaryRun.create({
          data: {
            createdAt: parsed.createdAt,
            persona: parsed.persona,
            label: parsed.label,
            tier: parsed.tier,
            adversaryModel: parsed.adversaryModel,
            sophistication: parsed.sophistication,
            verbosity: parsed.verbosity,
            hostility: parsed.hostility,
            focus: parsed.focus,
            turns: parsed.turns,
            seed: parsed.seed,
            inputTokens: parsed.inputTokens,
            outputTokens: parsed.outputTokens,
            transcript: JSON.stringify(parsed.transcript),
            metrics: JSON.stringify(parsed.metrics),
            runStamp: parsed.runStamp,
          },
        });
      }
      inserted += 1;
    }

    console.log(`Transcripts scanned: ${files.length}`);
    console.log(`Already in the DB:   ${already}`);
    console.log(`Skipped (mock):      ${skipped}`);
    console.log(`${dryRun ? "Would insert" : "Inserted"}:        ${inserted}`);
    console.log(`Unparseable:         ${problems.length}`);
    for (const p of problems.slice(0, 10)) console.log(`  ${p}`);

    if (inserted > 0) {
      console.log(
        `\nBackfilled runs carry true token totals but no per-line split, so they` +
          `\nreport no cost rather than a fabricated one. /review/adversary says so.`,
      );
    }
    if (dryRun) console.log("\nDry run — nothing written.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

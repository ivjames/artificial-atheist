// Recompute every adversary run's metrics from its stored transcript, in place.
//
//   npm run adversary:rescore -- --dry-run   # report what would change
//   npm run adversary:rescore               # write the recomputed metrics
//
// WHY: metrics are DERIVED data — scripts/adversary.ts scores the agent's
// replies with scoreAgentTurns at run time and stores the result. When a new
// heuristic is added (e.g. agentAvgSentences), runs saved before it existed
// carry a metrics blob that predates the field, so /review/adversary shows 0
// for them. The backfill can't fix this: it only INSERTS transcripts missing
// from the DB, and never touches rows already there.
//
// The fix is to re-derive. Each row keeps the full transcript (every agent
// reply verbatim), so re-running scoreAgentTurns over it reproduces the
// original score exactly AND fills in the newer metrics — no model calls, no
// cost. Idempotent: a row already holding the current metrics is left alone.
//
// A row with no agent turns in its transcript (nothing to score) is skipped
// rather than zeroed — scoring an empty transcript would overwrite real numbers
// with zeros, which is worse than leaving the stale blob in place.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { metricsFromTranscript } from "@/lib/agent/adversary";

type Line = { speaker: string; content: string };

// Host/db from DATABASE_URL with credentials stripped — so an operator can see
// which database a WRITE is about to hit before it happens (mirrors the
// harness's DB preflight in scripts/adversary.ts).
function dbTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "(DATABASE_URL unset)";
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  console.log(`Target DB: ${dbTarget()}`);
  console.log(dryRun ? "Mode: dry run (no writes)\n" : "Mode: writing\n");

  try {
    const rows = await prisma.adversaryRun.findMany({
      select: { id: true, persona: true, runStamp: true, transcript: true, metrics: true },
      orderBy: { createdAt: "asc" },
    });

    let changed = 0;
    let unchanged = 0;
    let skipped = 0;

    for (const row of rows) {
      let transcript: Line[];
      try {
        transcript = JSON.parse(row.transcript) as Line[];
      } catch {
        skipped += 1;
        console.log(`  skip ${row.runStamp} ${row.persona}: unparseable transcript`);
        continue;
      }

      // Nothing to score → don't overwrite existing numbers with zeros.
      if (!transcript.some((l) => l.speaker === "agent")) {
        skipped += 1;
        console.log(`  skip ${row.runStamp} ${row.persona}: no agent turns in transcript`);
        continue;
      }

      const recomputed = JSON.stringify(metricsFromTranscript(transcript));
      if (recomputed === row.metrics) {
        unchanged += 1;
        continue;
      }

      changed += 1;
      console.log(`  ${dryRun ? "would update" : "update"} ${row.runStamp} ${row.persona}`);
      if (!dryRun) {
        await prisma.adversaryRun.update({
          where: { id: row.id },
          data: { metrics: recomputed },
        });
      }
    }

    console.log(`\nRuns scanned:   ${rows.length}`);
    console.log(`${dryRun ? "Would change" : "Changed"}:   ${changed}`);
    console.log(`Unchanged:      ${unchanged}`);
    console.log(`Skipped:        ${skipped}`);
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

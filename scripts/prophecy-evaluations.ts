// Load machine-generated evaluation drafts into the prophecy module:
//   npm run prophecy:evals
//
// Reads every data/prophecy/evaluations-*.json in filename order and pushes
// it through loadEvaluationDrafts. Idempotent — an evaluation that already
// exists for the same (reviewer, claim, dimension) is skipped, never
// overwritten, so re-running after adding a file only lands the new rows.
//
// Run it on the droplet: the database is local there, which is also why this
// is a CLI step rather than a button on /review/prophecy.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadEvaluationDrafts, evaluationDisagreements } from "@/lib/prophecy/evaluations";

const prisma = new PrismaClient();

async function main() {
  const dir = path.join(process.cwd(), "data", "prophecy");

  // Plain readdir + filter instead of a glob dependency — the naming
  // convention is fixed and the repo takes no new deps. Sorted so a
  // multi-pass corpus loads in a deterministic order.
  let names: string[] = [];
  try {
    names = (await readdir(dir))
      .filter((n) => /^evaluations-.*\.json$/.test(n))
      .sort();
  } catch (e) {
    console.error(`cannot read ${dir}: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
    return;
  }

  if (names.length === 0) {
    console.log(`No evaluations-*.json files in ${dir} — nothing to load.`);
    return;
  }

  let created = 0;
  let skipped = 0;
  let errorCount = 0;

  for (const name of names) {
    const filePath = path.join(dir, name);
    const fileText = await readFile(filePath, "utf8");
    const r = await loadEvaluationDrafts(prisma, fileText);

    created += r.created;
    skipped += r.skipped;
    errorCount += r.errors.length;

    const bits = [`${r.created} created`, `${r.skipped} skipped`];
    if (r.errors.length) bits.push(`${r.errors.length} errors`);
    if (r.reviewerId) bits.push(`reviewer ${r.reviewerId}`);
    console.log(`${name}: ${bits.join(", ")}`);
    // Only the first few errors — a systematically broken file would
    // otherwise bury the summary under a thousand identical lines.
    for (const e of r.errors.slice(0, 5)) console.log(`    ${e}`);
    if (r.errors.length > 5) console.log(`    … ${r.errors.length - 5} more`);
  }

  console.log(
    `\nTotal: ${created} created, ${skipped} skipped` +
      (errorCount ? `, ${errorCount} errors` : ""),
  );

  const conflicts = await evaluationDisagreements(prisma);
  console.log(
    `${conflicts.length} claim/dimension pair(s) where reviewers disagree by 2 or more.`,
  );
  console.log("Review them at /review/prophecy/evaluations/");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

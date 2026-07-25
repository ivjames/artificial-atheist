/*
 * Right/wrong stats by player type (the pre-quiz intake stance).
 * Run on the server:  npm run stats
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  atheist: boolean | null;
  agnostic: boolean | null;
  results: bigint;
  correct: bigint;
  wrong: bigint;
  pct_correct: number | null;
};

function typeLabel(atheist: boolean | null, agnostic: boolean | null): string {
  if (atheist === null && agnostic === null) return "unknown / skipped";
  const know = agnostic ? "agnostic" : "gnostic";
  const bel = atheist ? "atheist" : "theist";
  return `${know} ${bel}`;
}

async function main() {
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT r.atheist, r.agnostic,
           COUNT(DISTINCT r.id)                                              AS results,
           COUNT(*) FILTER (WHERE a."isCorrect")                             AS correct,
           COUNT(*) FILTER (WHERE NOT a."isCorrect")                         AS wrong,
           ROUND(100.0 * COUNT(*) FILTER (WHERE a."isCorrect") / COUNT(*), 1) AS pct_correct
    FROM "Result" r
    JOIN "Answer" a ON a."resultId" = r.id
    GROUP BY r.atheist, r.agnostic
    ORDER BY r.atheist NULLS LAST, r.agnostic NULLS LAST;
  `;

  if (rows.length === 0) {
    console.log("No results yet.");
    return;
  }

  console.log("\nRight/wrong by player type\n");
  console.log(
    ["Player type".padEnd(20), "Results".padStart(8), "Correct".padStart(8), "Wrong".padStart(7), "% right".padStart(8)].join("  "),
  );
  console.log("-".repeat(57));
  for (const r of rows) {
    console.log(
      [
        typeLabel(r.atheist, r.agnostic).padEnd(20),
        String(r.results).padStart(8),
        String(r.correct).padStart(8),
        String(r.wrong).padStart(7),
        `${r.pct_correct ?? 0}%`.padStart(8),
      ].join("  "),
    );
  }
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

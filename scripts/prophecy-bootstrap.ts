// Stand up the whole prophecy corpus from the committed datasets:
//   npm run prophecy:bootstrap
//
// Imports every list in data/prophecy/manifest.json, then loads the AI claim
// drafts. Idempotent — re-run it after adding a dataset and only the new rows
// land. The same operation is available as a button on /review/prophecy for
// operators who would rather not SSH.
//
// Pass --lists-only to import the source lists without the claim drafts.

import { PrismaClient } from "@prisma/client";
import { bootstrapProphecyData } from "@/lib/prophecy/bootstrap";

const prisma = new PrismaClient();

async function main() {
  const skipClaims = process.argv.includes("--lists-only");
  const r = await bootstrapProphecyData(prisma, { skipClaims });

  for (const l of r.lists) {
    const bits = [
      l.listCreated ? "list created" : "list existed",
      `${l.entriesCreated} entries created`,
      `${l.entriesSkipped} skipped`,
    ];
    if (l.errors.length) bits.push(`${l.errors.length} errors`);
    console.log(`${l.slug}: ${bits.join(", ")}`);
    for (const e of l.errors.slice(0, 5)) console.log(`    ${e}`);
  }

  if (r.claims.attempted) {
    console.log(
      `claims: ${r.claims.claimsCreated} created, ${r.claims.claimsSkipped} skipped; ` +
        `mappings: ${r.claims.mappingsCreated} created, ${r.claims.mappingsSkipped} skipped` +
        (r.claims.errors.length ? `, ${r.claims.errors.length} errors` : ""),
    );
    for (const e of r.claims.errors.slice(0, 5)) console.log(`    ${e}`);
  }

  for (const e of r.errors) console.log(`ERROR ${e}`);

  const unmapped = await prisma.prophecySourceListEntry.count({
    where: { mappingStatus: "unmapped" },
  });
  const drafts = await prisma.prophecyClaim.count({ where: { status: "draft" } });
  console.log(`\nReady: ${drafts} draft claims to review, ${unmapped} entries still unmapped.`);
  console.log("Review them at /review/prophecy/claims/?status=draft");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

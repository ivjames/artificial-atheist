// CLI entry points for the article pipeline (§5). Run via:
//   npm run pipeline:cluster        # find eligible topics → queued drafts
//   npm run pipeline:draft -- <id>  # write + scrub one draft → review
//   tsx scripts/pipeline.ts auto    # cluster, then (opt-in) draft+scrub all queued
//
// `draft <id>` runs both Slot B (write) and Slot C (scrub) so the draft lands
// in "review" status, ready for a human at /review/pipeline — nothing here
// ever publishes on its own. `auto` is the scheduled entry point (see
// deploy/atheismiq-pipeline.timer): it always clusters, and additionally
// drafts+scrubs every queued draft ONLY when PIPELINE_AUTODRAFT is set (so the
// scheduled job doesn't incur surprise model spend by default). Publishing is
// always human-gated regardless.
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { runClustering } from "@/lib/pipeline/cluster";
import { draftArticle } from "@/lib/pipeline/draft";
import { scrubArticle } from "@/lib/pipeline/scrub";

async function runCluster(): Promise<void> {
  const created = await runClustering();
  if (created.length === 0) {
    console.log("No topic crossed the distinct-user threshold — no drafts created.");
    return;
  }
  console.log(`Created ${created.length} draft(s):`);
  for (const d of created) {
    console.log(`  ${d.id}  topic=${d.topic}  distinctUsers=${d.distinctUsers}`);
  }
}

async function runDraft(draftId: string | undefined): Promise<void> {
  if (!draftId) {
    console.error("Usage: npm run pipeline:draft -- <draftId>");
    process.exitCode = 1;
    return;
  }
  console.log(`Drafting ${draftId} (Slot B)...`);
  await draftArticle(draftId);
  console.log(`Scrubbing ${draftId} (Slot C)...`);
  await scrubArticle(draftId);
  console.log(`Draft ${draftId} is in "review" — approve/reject it at /review/pipeline.`);
}

// Scheduled entry point: always cluster; draft+scrub queued drafts only when
// PIPELINE_AUTODRAFT is truthy. Best-effort — one failing draft doesn't abort
// the rest.
async function runAuto(): Promise<void> {
  await runCluster();

  const autodraft = /^(1|true|yes|on)$/i.test(process.env.PIPELINE_AUTODRAFT ?? "");
  if (!autodraft) {
    console.log(
      "PIPELINE_AUTODRAFT not set — leaving queued drafts for manual drafting at /review/pipeline.",
    );
    return;
  }

  const queued = await prisma.articleDraft.findMany({
    where: { status: "queued" },
    select: { id: true },
  });
  console.log(`Auto-drafting ${queued.length} queued draft(s)...`);
  for (const { id } of queued) {
    try {
      await draftArticle(id);
      await scrubArticle(id);
      console.log(`  ${id} → review`);
    } catch (err) {
      console.error(`  ${id} failed:`, (err as Error).message);
    }
  }
}

async function main(): Promise<void> {
  const [, , command, arg] = process.argv;

  switch (command) {
    case "cluster":
      await runCluster();
      break;
    case "draft":
      await runDraft(arg);
      break;
    case "auto":
      await runAuto();
      break;
    default:
      console.error("Usage: tsx scripts/pipeline.ts <cluster|draft|auto> [draftId]");
      process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

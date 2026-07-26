// Draft dimensional ratings for prophecy claims — batch, off-session, cheap.
//
//   npm run prophecy:evaluate -- --dry-run          # cost estimate, submits nothing
//   npm run prophecy:evaluate -- --submit           # create the batch, print its id
//   npm run prophecy:evaluate -- --collect <batchId> # write the drafts file
//
// WHY THE BATCH API, specifically:
//
//   1. It bills API credits, metered per token. The 5-hour rolling window is a
//      Claude Code / claude.ai SUBSCRIPTION mechanism and does not apply to API
//      keys at all — so a batch run cannot consume subscription usage or trip
//      that window no matter how long it runs or how many claims it covers.
//   2. Batch requests do not draw on the interactive per-minute rate limits, so
//      this can't starve the live app of capacity while it runs.
//   3. It's 50% off, and results land within 24h — the discount IS the
//      overnight mechanism. Pacing alone would save nothing; total tokens are
//      the same whether spent in an hour or a week.
//
// Everything it emits is a DRAFT: loadEvaluationDrafts refuses files without
// provenance, rejects blank rationales, and attributes ratings to an AI
// reviewer, never to the human editor.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import { PROPHECY_VOCAB, SCORE_LABELS } from "@/lib/prophecy/vocab";

const PROMPT_VERSION = "prophecy-evaluate-v1";
const DATA_DIR = path.join(process.cwd(), "data", "prophecy");

const PREDICTION_DIMS = PROPHECY_VOCAB.filter((t) => t.kind === "prediction_dimension");
const FULFILLMENT_DIMS = PROPHECY_VOCAB.filter((t) => t.kind === "fulfillment_dimension");

type Args = {
  mode: "dry-run" | "submit" | "collect";
  batchId: string;
  pass: string;
  model: string;
  limit: number;
  status: string;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const collectIdx = argv.indexOf("--collect");
  return {
    mode: argv.includes("--submit")
      ? "submit"
      : collectIdx >= 0
        ? "collect"
        : "dry-run",
    batchId: collectIdx >= 0 ? (argv[collectIdx + 1] ?? "") : "",
    // Two passes with different models is the point: where a cheap rater and a
    // stronger one disagree is exactly where a human should look.
    pass: get("--pass", "pass-a"),
    model: get("--model", "claude-haiku-4-5"),
    limit: Number.parseInt(get("--limit", "0"), 10) || 0,
    status: get("--status", "draft"),
  };
}

// The rubric is byte-identical across every request, so it sits first and is
// marked for caching — 546 requests share one cached prefix instead of paying
// for it 546 times.
function rubricPrefix(): string {
  const dim = (t: { key: string; label: string; description: string }) =>
    `- ${t.key} (${t.label}): ${t.description}`;
  return [
    "You are rating a prophecy claim drawn from circulated lists of 'prophecies fulfilled by Jesus'.",
    "",
    "You assess the QUALITY OF THE PREDICTION and of the ALLEGED FULFILLMENT — not whether",
    "Christianity is true, and not whether you find the claim congenial. Rate the claim as the",
    "lists present it, against the cited passage in its own literary and historical context.",
    "",
    "Score each dimension 0-5:",
    ...SCORE_LABELS.map((label, i) => `  ${i} = ${label}`),
    "",
    "PREDICTION-QUALITY DIMENSIONS:",
    ...PREDICTION_DIMS.map(dim),
    "",
    "FULFILLMENT-QUALITY DIMENSIONS:",
    ...FULFILLMENT_DIMS.map(dim),
    "",
    "Calibration notes:",
    "- Use the full range including 0 and 5. Typological and symbolic readings score low on",
    "  explicitness, specificity, and falsifiability — that is what typology IS, not a hostile",
    "  judgment.",
    "- Where the only evidence for a fulfillment is a text written inside the same tradition that",
    "  also cites the prophecy, independent_attestation, external_corroboration, and",
    "  narrative_resistance are low (0-2). Say so plainly.",
    "- Where dating, translation, or authorship is genuinely disputed among scholars, let that pull",
    "  the dimension toward the middle and lower your confidence rather than silently picking a side.",
    "- rationale: 1-2 concrete sentences naming the actual reason — the passage's context, the dating",
    "  problem, which source attests it. It is displayed to readers beside the score, so it must",
    "  carry the number. No boilerplate, no hedging filler.",
    "- confidence: your confidence in your OWN rating (5 = clear-cut, 2 = genuinely contested).",
    "",
    "An informed believing scholar and an informed critic should both recognize each rationale as",
    "fair, even where they would score differently. Do not editorialize about religion in either",
    "direction.",
    "",
    "Reply with ONLY a JSON array, no prose and no code fence. One object per dimension, covering",
    `all ${PREDICTION_DIMS.length + FULFILLMENT_DIMS.length} dimensions exactly once:`,
    '[{"dimensionKey":"prior_dating","dimensionKind":"prediction_dimension","score":3,"rationale":"...","confidence":4}]',
  ].join("\n");
}

type ClaimForRating = {
  slug: string;
  text: string;
  summary: string;
  entries: Array<{ list: string; entryNumber: string; wording: string; passageRefs: string }>;
};

function claimPrompt(c: ClaimForRating): string {
  const entries = c.entries
    .map(
      (e) =>
        `- [${e.list} #${e.entryNumber}] ${e.passageRefs ? `(${e.passageRefs}) ` : ""}"${e.wording}"`,
    )
    .join("\n");
  return [
    `CLAIM: ${c.text}`,
    c.summary ? `CONTEXT: ${c.summary}` : "",
    "",
    "SOURCE ENTRIES asserting this claim, verbatim from the published lists:",
    entries || "(none recorded)",
    "",
    "Rate every dimension now.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function loadClaims(prisma: PrismaClient, args: Args): Promise<ClaimForRating[]> {
  const claims = await prisma.prophecyClaim.findMany({
    where: args.status === "any" ? {} : { status: args.status },
    orderBy: { slug: "asc" },
    ...(args.limit ? { take: args.limit } : {}),
    include: {
      entryMaps: {
        include: {
          entry: {
            select: {
              entryNumber: true,
              originalWording: true,
              originalPassageRefs: true,
              sourceList: { select: { slug: true } },
            },
          },
        },
      },
    },
  });

  return claims.map((c) => ({
    slug: c.slug,
    text: c.text,
    summary: c.summary,
    entries: c.entryMaps.map((m) => ({
      list: m.entry.sourceList.slug,
      entryNumber: m.entry.entryNumber,
      wording: m.entry.originalWording,
      passageRefs: m.entry.originalPassageRefs,
    })),
  }));
}

function buildRequests(claims: ClaimForRating[], args: Args) {
  const prefix = rubricPrefix();
  return claims.map((c) => ({
    custom_id: c.slug.slice(0, 64),
    params: {
      model: args.model,
      max_tokens: 4096,
      system: [
        {
          type: "text" as const,
          text: prefix,
          // One cached prefix shared by every request in the batch.
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user" as const, content: claimPrompt(c) }],
    },
  }));
}

// Rough token estimate — 4 chars/token is close enough to decide whether to
// spend money, and costs nothing to compute.
function estimate(requests: ReturnType<typeof buildRequests>) {
  const prefixChars = rubricPrefix().length;
  const perClaimChars = requests.reduce(
    (n, r) => n + JSON.stringify(r.params.messages).length,
    0,
  );
  const dims = PREDICTION_DIMS.length + FULFILLMENT_DIMS.length;
  return {
    requests: requests.length,
    cachedPrefixTokens: Math.round(prefixChars / 4),
    uncachedInputTokens: Math.round(perClaimChars / 4),
    // ~120 tokens per dimension rating with its rationale.
    outputTokens: requests.length * dims * 120,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    if (args.mode === "collect") {
      if (!args.batchId) throw new Error("--collect needs a batch id");
      await collect(args);
      return;
    }

    const claims = await loadClaims(prisma, args);
    if (claims.length === 0) {
      console.log(`No claims with status "${args.status}". Nothing to rate.`);
      return;
    }
    const requests = buildRequests(claims, args);
    const est = estimate(requests);

    console.log(`Claims:            ${est.requests}`);
    console.log(`Cached prefix:     ~${est.cachedPrefixTokens.toLocaleString()} tokens (charged once, then ~0.1x)`);
    console.log(`Per-claim input:   ~${est.uncachedInputTokens.toLocaleString()} tokens total`);
    console.log(`Expected output:   ~${est.outputTokens.toLocaleString()} tokens`);
    console.log(`Model:             ${args.model}   Pass: ${args.pass}`);
    console.log("Billing:           API credits, batch rate (50% off). Not subscription usage;");
    console.log("                   the 5-hour window does not apply to API keys.");

    if (args.mode === "dry-run") {
      console.log("\nDry run — nothing submitted. Re-run with --submit to create the batch.");
      return;
    }

    const client = new Anthropic({ apiKey: requireKey() });
    const batch = await client.messages.batches.create({ requests: requests as never });
    console.log(`\nBatch created: ${batch.id}`);
    console.log(`Status: ${batch.processing_status}`);
    console.log(`\nCollect when it finishes (usually well under an hour, max 24h):`);
    console.log(`  npm run prophecy:evaluate -- --collect ${batch.id} --pass ${args.pass}`);
  } finally {
    await prisma.$disconnect();
  }
}

function requireKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set (it lives in /etc/aa-admin.env on the droplet)");
  return key;
}

// Pull a finished batch and write the drafts file. Malformed rows are dropped
// with a warning rather than aborting — one bad JSON reply shouldn't cost the
// other 545 results.
async function collect(args: Args) {
  const client = new Anthropic({ apiKey: requireKey() });
  const batch = await client.messages.batches.retrieve(args.batchId);
  if (batch.processing_status !== "ended") {
    console.log(`Batch ${args.batchId} is still ${batch.processing_status}. Try again later.`);
    return;
  }

  const evaluations: EvalRow[] = [];
  const problems: string[] = [];
  let ok = 0;

  for await (const result of await client.messages.batches.results(args.batchId)) {
    const slug = result.custom_id;
    if (result.result.type !== "succeeded") {
      problems.push(`${slug}: ${result.result.type}`);
      continue;
    }
    const text = result.result.message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const rows = parseRows(text, slug);
    if (!rows.length) {
      problems.push(`${slug}: no parseable ratings`);
      continue;
    }
    evaluations.push(...rows);
    ok += 1;
  }

  const file = {
    meta: {
      // Deliberately generic — a run is pinned by promptVersion + generatedAt,
      // and vendor strings don't belong in committed artifacts.
      model: "ai-rater",
      promptVersion: PROMPT_VERSION,
      generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
      pass: args.pass,
    },
    evaluations,
  };

  const out = path.join(DATA_DIR, `evaluations-${args.pass}.json`);
  fs.writeFileSync(out, `${JSON.stringify(file, null, 1)}\n`, "utf8");

  console.log(`Claims rated:  ${ok}`);
  console.log(`Ratings:       ${evaluations.length}`);
  console.log(`Problems:      ${problems.length}`);
  for (const p of problems.slice(0, 10)) console.log(`  ${p}`);
  console.log(`\nWrote ${out}`);
  console.log(`Load it with:  npm run prophecy:evals`);
}

type EvalRow = {
  claimSlug: string;
  dimensionKey: string;
  dimensionKind: string;
  score: number;
  rationale: string;
  confidence: number;
};

const VALID_DIMS = new Map<string, string>([
  ...PREDICTION_DIMS.map((t) => [t.key, "prediction_dimension"] as [string, string]),
  ...FULFILLMENT_DIMS.map((t) => [t.key, "fulfillment_dimension"] as [string, string]),
]);

// Tolerant of a stray code fence or leading prose; strict about the fields,
// because the loader will reject a bad row anyway and a silent bad score is
// worse than a dropped one.
export function parseRows(text: string, slug: string): EvalRow[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const rows: EvalRow[] = [];
  const seen = new Set<string>();
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const dimensionKey = typeof r.dimensionKey === "string" ? r.dimensionKey : "";
    const kind = VALID_DIMS.get(dimensionKey);
    const score = typeof r.score === "number" ? Math.round(r.score) : NaN;
    const confidence = typeof r.confidence === "number" ? Math.round(r.confidence) : NaN;
    const rationale = typeof r.rationale === "string" ? r.rationale.trim() : "";
    if (!kind || seen.has(dimensionKey)) continue;
    if (!Number.isInteger(score) || score < 0 || score > 5) continue;
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 5) continue;
    if (!rationale) continue;
    seen.add(dimensionKey);
    rows.push({
      claimSlug: slug,
      dimensionKey,
      dimensionKind: kind,
      score,
      rationale,
      confidence,
    });
  }
  return rows;
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

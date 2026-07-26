import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  claimEvaluations,
  evaluationDisagreements,
  loadEvaluationDrafts,
} from "@/lib/prophecy/evaluations";

// Phase 5 evaluation-loader tests. Same two-block layout as
// prophecy-draftload.test.ts:
// - pure validation tests (file-level refusals return before any DB call — a
//   null Prisma client proves it by exploding if anything tries);
// - DB integration gated on DATABASE_URL. Fixtures use the "t-eval-" slug
//   prefix and are swept by prefix in afterAll (pre-cleaned in beforeAll too,
//   so a crashed run leaves debuggable rows the next run removes).
//
// Reviewer identities in the fixtures are deliberately generic
// ("ai-normalizer" / "pass-a"): the loader must not care which system
// produced the file, only that provenance is present.

const NO_DB = null as unknown as PrismaClient;

const META = {
  model: "ai-normalizer",
  promptVersion: "v1-test",
  generatedAt: "2026-07-26T00:00:00Z",
  pass: "pass-a",
};

// A single well-formed evaluation, cloned and tweaked per test.
const OK = {
  claimSlug: "t-eval-alpha",
  dimensionKey: "specificity",
  dimensionKind: "prediction_dimension",
  score: 4,
  rationale: "Names a place and a person.",
  confidence: 3,
};

describe("loadEvaluationDrafts validation (pure)", () => {
  it("refuses unparseable JSON with a single error", async () => {
    const res = await loadEvaluationDrafts(NO_DB, "not json {");
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/invalid JSON/);
    expect(res.created + res.skipped).toBe(0);
    expect(res.reviewerId).toBe("");
  });

  it("refuses a non-object top level", async () => {
    const res = await loadEvaluationDrafts(NO_DB, JSON.stringify([1, 2, 3]));
    expect(res.errors).toEqual(["invalid file: expected a top-level object"]);
  });

  it("refuses a file with no meta (provenance mandatory)", async () => {
    const res = await loadEvaluationDrafts(NO_DB, JSON.stringify({ evaluations: [] }));
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/provenance is mandatory/);
  });

  it.each(["model", "promptVersion", "generatedAt", "pass"])(
    "refuses the whole file when meta.%s is missing",
    async (field) => {
      const meta: Record<string, string> = { ...META };
      delete meta[field];
      const res = await loadEvaluationDrafts(NO_DB, JSON.stringify({ meta, evaluations: [] }));
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]).toMatch(/provenance is mandatory/);
      expect(res.created).toBe(0);
      expect(res.reviewerId).toBe("");
    },
  );

  it("refuses blank-string provenance fields", async () => {
    const res = await loadEvaluationDrafts(
      NO_DB,
      JSON.stringify({ meta: { ...META, pass: "   " }, evaluations: [] }),
    );
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/provenance is mandatory/);
  });

  it("refuses when evaluations is not an array", async () => {
    const res = await loadEvaluationDrafts(
      NO_DB,
      JSON.stringify({ meta: META, evaluations: "nope" }),
    );
    expect(res.errors).toEqual(["invalid file: evaluations must be an array"]);
  });
});

// ---------------------------------------------------------------------------
// DB integration (requires DATABASE_URL)
// ---------------------------------------------------------------------------

const PREFIX = "t-eval-";
const REVIEWER_PREFIX = "ai-ai-normalizer-pass-"; // slugify("ai-<model>-<pass>")

describe.skipIf(!process.env.DATABASE_URL)("loadEvaluationDrafts (DB)", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  // Sweep in FK order: evaluations (they point at both claims and reviewers),
  // then the fixture claims, then the fixture reviewers.
  async function cleanup() {
    const claims = await prisma.prophecyClaim.findMany({
      where: { slug: { startsWith: PREFIX } },
      select: { id: true },
    });
    const claimIds = claims.map((c) => c.id);
    if (claimIds.length) {
      await prisma.prophecyEvaluation.deleteMany({
        where: { targetType: "claim", targetId: { in: claimIds } },
      });
      await prisma.prophecyRevision.deleteMany({ where: { targetId: { in: claimIds } } });
      await prisma.prophecyClaim.deleteMany({ where: { id: { in: claimIds } } });
    }
    const reviewers = await prisma.prophecyReviewer.findMany({
      where: { slug: { startsWith: REVIEWER_PREFIX } },
      select: { id: true },
    });
    const reviewerIds = reviewers.map((r) => r.id);
    if (reviewerIds.length) {
      // Belt and braces: any evaluation still hanging off a test reviewer
      // would block the delete, and leaving orphan reviewers pollutes the
      // shared dev DB's stats.
      await prisma.prophecyEvaluation.deleteMany({ where: { reviewerId: { in: reviewerIds } } });
      await prisma.prophecyReviewer.deleteMany({ where: { id: { in: reviewerIds } } });
    }
  }

  beforeAll(async () => {
    await cleanup(); // pre-clean leftovers from a crashed run
    await prisma.prophecyClaim.createMany({
      data: [
        {
          slug: `${PREFIX}alpha`,
          text: "A test ruler will arise from a named town (evaluation fixture alpha)",
          status: "draft",
        },
        {
          slug: `${PREFIX}beta`,
          text: "A test temple will fall within a generation (evaluation fixture beta)",
          status: "draft",
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // Four rows across both dimension kinds and both fixture claims.
  const fixture = (pass = "pass-a") =>
    JSON.stringify({
      meta: { ...META, pass },
      evaluations: [
        { ...OK },
        {
          claimSlug: `${PREFIX}alpha`,
          dimensionKey: "prior_dating",
          dimensionKind: "prediction_dimension",
          score: 2,
          rationale: "Dating of the passage is contested.",
          confidence: 2,
        },
        {
          claimSlug: `${PREFIX}alpha`,
          dimensionKey: "independent_attestation",
          dimensionKind: "fulfillment_dimension",
          score: 1,
          rationale: "Only tradition-internal sources report it.",
          confidence: 4,
        },
        {
          claimSlug: `${PREFIX}beta`,
          dimensionKey: "specificity",
          dimensionKind: "prediction_dimension",
          score: 3,
          rationale: "Names the structure but not the year.",
          confidence: 3,
        },
      ],
    });

  let reviewerA = "";

  it("first run creates draft evaluations and auto-creates one reviewer", async () => {
    const res = await loadEvaluationDrafts(prisma, fixture());
    expect(res.errors).toEqual([]);
    expect(res.created).toBe(4);
    expect(res.skipped).toBe(0);
    expect(res.reviewerId).not.toBe("");
    reviewerA = res.reviewerId;

    const reviewer = await prisma.prophecyReviewer.findUniqueOrThrow({
      where: { id: reviewerA },
    });
    // Attribution: never the human editor.
    expect(reviewer.slug).toBe(`${REVIEWER_PREFIX}a`);
    expect(reviewer.perspective).toMatch(/no declared tradition/i);

    const rows = await prisma.prophecyEvaluation.findMany({ where: { reviewerId: reviewerA } });
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.status).toBe("draft");
      expect(r.targetType).toBe("claim");
      expect(r.rationale.length).toBeGreaterThan(0);
    }
    // Descriptive label stored alongside the number.
    const spec = rows.find((r) => r.dimension === "specificity" && r.score === 4);
    expect(spec!.label).toBe("strong");
  });

  it("second run is a no-op: everything skipped, reviewer reused", async () => {
    const res = await loadEvaluationDrafts(prisma, fixture());
    expect(res.errors).toEqual([]);
    expect(res.created).toBe(0);
    expect(res.skipped).toBe(4);
    expect(res.reviewerId).toBe(reviewerA); // resolved, not re-created
    expect(await prisma.prophecyEvaluation.count({ where: { reviewerId: reviewerA } })).toBe(4);
    expect(
      await prisma.prophecyReviewer.count({ where: { slug: { startsWith: REVIEWER_PREFIX } } }),
    ).toBe(1);
  });

  it("never overwrites an existing score, even when the file changes it", async () => {
    const res = await loadEvaluationDrafts(
      prisma,
      JSON.stringify({
        meta: META,
        evaluations: [{ ...OK, score: 0, rationale: "Rewritten by a re-run — must not land." }],
      }),
    );
    expect(res.created).toBe(0);
    expect(res.skipped).toBe(1);
    const row = await prisma.prophecyEvaluation.findFirstOrThrow({
      where: { reviewerId: reviewerA, dimension: "specificity" },
    });
    expect(row.score).toBe(4);
    expect(row.rationale).toBe(OK.rationale);
  });

  it("per-item errors (unknown claim, bad dimension, bad score, blank rationale) never abort the run", async () => {
    const res = await loadEvaluationDrafts(
      prisma,
      JSON.stringify({
        meta: META,
        evaluations: [
          { ...OK, claimSlug: "t-eval-no-such-claim", dimensionKey: "clarity" },
          { ...OK, dimensionKind: "resolution_dimension", dimensionKey: "parsimony" },
          { ...OK, dimensionKey: "not_a_dimension" },
          { ...OK, dimensionKey: "clarity", score: 9 },
          { ...OK, dimensionKey: "clarity", score: 2.5 },
          { ...OK, dimensionKey: "clarity", confidence: -1 },
          { ...OK, dimensionKey: "clarity", rationale: "   " },
          // …and one good row that must still land despite its siblings.
          { ...OK, dimensionKey: "clarity", score: 5, rationale: "Plain reading, no machinery." },
        ],
      }),
    );

    expect(res.created).toBe(1);
    expect(res.errors).toHaveLength(7);
    expect(res.errors[0]).toMatch(/unknown claim slug "t-eval-no-such-claim"/);
    // resolution_dimension is a real vocab kind but not a claim target.
    expect(res.errors[1]).toMatch(/unknown dimensionKind "resolution_dimension"/);
    expect(res.errors[2]).toMatch(/unknown dimensionKey "not_a_dimension"/);
    expect(res.errors[3]).toMatch(/score must be a whole number/);
    expect(res.errors[4]).toMatch(/score must be a whole number/);
    expect(res.errors[5]).toMatch(/confidence must be a whole number/);
    expect(res.errors[6]).toMatch(/rationale is required/);

    expect(await prisma.prophecyEvaluation.count({ where: { reviewerId: reviewerA } })).toBe(5);
  });

  it("claimEvaluations returns vocab-ordered rows with labels", async () => {
    const alpha = await prisma.prophecyClaim.findUniqueOrThrow({
      where: { slug: `${PREFIX}alpha` },
    });
    const rows = await claimEvaluations(prisma, alpha.id);
    expect(rows).toHaveLength(4);

    // Prediction dimensions first, then fulfillment; within prediction, the
    // vocab order puts prior_dating (index 0) before specificity (3) and
    // clarity (4).
    expect(rows.map((r) => r.dimensionKey)).toEqual([
      "prior_dating",
      "specificity",
      "clarity",
      "independent_attestation",
    ]);
    expect(rows.map((r) => r.dimensionKind)).toEqual([
      "prediction_dimension",
      "prediction_dimension",
      "prediction_dimension",
      "fulfillment_dimension",
    ]);
    expect(rows[0].label).toBe("Prior dating");
    expect(rows[0].scoreLabel).toBe("weak"); // score 2
    expect(rows[0].reviewerSlug).toBe(`${REVIEWER_PREFIX}a`);
    expect(rows[0].status).toBe("draft");
    expect(rows[0].confidence).toBe(2);
  });

  it("a second pass gets its own reviewer and its splits surface as disagreements", async () => {
    // Same claim + dimensions, different scores: prior_dating 2 → 5 (gap 3)
    // and specificity 4 → 3 (gap 1, below the default threshold).
    const res = await loadEvaluationDrafts(
      prisma,
      JSON.stringify({
        meta: { ...META, pass: "pass-b" },
        evaluations: [
          {
            claimSlug: `${PREFIX}alpha`,
            dimensionKey: "prior_dating",
            dimensionKind: "prediction_dimension",
            score: 5,
            rationale: "Second pass reads the dating evidence as settled.",
            confidence: 4,
          },
          {
            claimSlug: `${PREFIX}alpha`,
            dimensionKey: "specificity",
            dimensionKind: "prediction_dimension",
            score: 3,
            rationale: "Second pass finds the detail thinner.",
            confidence: 3,
          },
        ],
      }),
    );
    expect(res.errors).toEqual([]);
    expect(res.created).toBe(2);
    expect(res.reviewerId).not.toBe(reviewerA); // a distinct identity
    expect(
      await prisma.prophecyReviewer.count({ where: { slug: { startsWith: REVIEWER_PREFIX } } }),
    ).toBe(2);

    const alpha = await prisma.prophecyClaim.findUniqueOrThrow({
      where: { slug: `${PREFIX}alpha` },
    });

    const wide = (await evaluationDisagreements(prisma)).filter((d) => d.claimId === alpha.id);
    expect(wide).toHaveLength(1); // only prior_dating clears gap >= 2
    expect(wide[0].dimensionKey).toBe("prior_dating");
    expect(wide[0].dimensionKind).toBe("prediction_dimension");
    expect(wide[0].gap).toBe(3);
    expect(wide[0].claimSlug).toBe(`${PREFIX}alpha`);
    expect(wide[0].scores).toHaveLength(2);
    expect(wide[0].scores.map((s) => s.score)).toEqual([5, 2]); // highest first
    expect(new Set(wide[0].scores.map((s) => s.reviewerSlug)).size).toBe(2);

    // minGap 1 also picks up the one-point specificity split.
    const narrow = (await evaluationDisagreements(prisma, { minGap: 1 })).filter(
      (d) => d.claimId === alpha.id,
    );
    expect(narrow.map((d) => d.dimensionKey)).toEqual(["prior_dating", "specificity"]);
    expect(narrow[0].gap).toBeGreaterThanOrEqual(narrow[1].gap); // widest first

    // A dimension only one reviewer touched is never a "disagreement".
    expect(narrow.some((d) => d.dimensionKey === "independent_attestation")).toBe(false);
  });
});

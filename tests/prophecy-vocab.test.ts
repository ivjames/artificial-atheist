import { describe, expect, it } from "vitest";
import {
  EVIDENTIARY_DIRECTIONS,
  MATCH_TYPES,
  MODERATION_STATES,
  PROPHECY_VOCAB,
  RELATIONSHIP_TYPES,
  SCORE_LABELS,
} from "@/lib/prophecy/vocab";

// The vocab file is the single source of the seeded controlled vocabulary
// (PROPHECY-HANDOFF.md). These tests pin the handoff's exact term counts and
// the invariants the seeder and app-layer validation depend on — pure data,
// no DB.

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

// Expected term count per kind, straight from the handoff.
const EXPECTED_COUNTS: Record<string, number> = {
  category: 23,
  subject: 15,
  interpretation_method: 9,
  relationship_type: 14,
  evidence_type: 9,
  prediction_dimension: 12,
  fulfillment_dimension: 11,
  resolution_dimension: 9,
  source_type: 11,
};

function byKind(kind: string) {
  return PROPHECY_VOCAB.filter((t) => t.kind === kind);
}

describe("PROPHECY_VOCAB", () => {
  it("has no duplicate kind+key pairs", () => {
    const seen = new Set<string>();
    for (const t of PROPHECY_VOCAB) {
      const id = `${t.kind}:${t.key}`;
      expect(seen.has(id), `duplicate ${id}`).toBe(false);
      seen.add(id);
    }
  });

  it("contains exactly the expected kinds, each non-empty", () => {
    const kinds = new Set(PROPHECY_VOCAB.map((t) => t.kind));
    expect([...kinds].sort()).toEqual(Object.keys(EXPECTED_COUNTS).sort());
    for (const kind of kinds) {
      expect(byKind(kind).length).toBeGreaterThan(0);
    }
  });

  it("matches the handoff's term counts per kind", () => {
    for (const [kind, count] of Object.entries(EXPECTED_COUNTS)) {
      expect(byKind(kind).length, kind).toBe(count);
    }
    // Sum check so a new kind can't sneak in unaccounted.
    const total = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0);
    expect(PROPHECY_VOCAB.length).toBe(total);
  });

  it("uses snake_case keys and kinds", () => {
    for (const t of PROPHECY_VOCAB) {
      expect(t.key, t.key).toMatch(SNAKE_CASE);
      expect(t.kind, t.kind).toMatch(SNAKE_CASE);
    }
  });

  it("has a non-empty label and description on every term", () => {
    for (const t of PROPHECY_VOCAB) {
      expect(t.label.trim().length, `${t.kind}:${t.key}`).toBeGreaterThan(0);
      expect(t.description.trim().length, `${t.kind}:${t.key}`).toBeGreaterThan(0);
    }
  });
});

describe("constant arrays", () => {
  it("SCORE_LABELS has exactly 6 entries for scores 0-5", () => {
    expect(SCORE_LABELS).toHaveLength(6);
    expect(SCORE_LABELS[0]).toBe("absent");
    expect(SCORE_LABELS[5]).toBe("very_strong");
  });

  it("moderation states match the handoff's workflow states", () => {
    expect(MODERATION_STATES).toEqual([
      "draft",
      "submitted",
      "needs_changes",
      "approved",
      "published",
      "rejected",
      "archived",
      "superseded",
    ]);
  });

  it("evidentiary directions are the handoff's four classifications", () => {
    expect(EVIDENTIARY_DIRECTIONS).toEqual(["internal", "external", "mixed", "not_testable"]);
  });

  it("match types cover the handoff's entry-to-claim mapping cases", () => {
    expect(MATCH_TYPES).toEqual([
      "exact",
      "partial",
      "compound",
      "duplicate",
      "near_duplicate",
      "disputed",
    ]);
  });

  it("RELATIONSHIP_TYPES mirrors the relationship_type vocab terms", () => {
    expect(RELATIONSHIP_TYPES).toEqual(byKind("relationship_type").map((t) => t.key));
    expect(RELATIONSHIP_TYPES).toHaveLength(14);
  });

  it("all constant-array values are snake_case", () => {
    for (const v of [
      ...MODERATION_STATES,
      ...EVIDENTIARY_DIRECTIONS,
      ...SCORE_LABELS,
      ...MATCH_TYPES,
      ...RELATIONSHIP_TYPES,
    ]) {
      expect(v).toMatch(SNAKE_CASE);
    }
  });
});

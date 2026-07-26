// Parser tests for the batch rating collector. The parser is deliberately
// tolerant of wrapper text but strict about field validity: the loader would
// reject a malformed row anyway, and a silently-wrong score is worse than a
// dropped one.

import { describe, expect, it } from "vitest";
import { parseRows } from "@/scripts/prophecy-evaluate";

const good = JSON.stringify([
  { dimensionKey: "prior_dating", dimensionKind: "prediction_dimension", score: 4, rationale: "Attested at Qumran.", confidence: 4 },
  { dimensionKey: "independent_attestation", dimensionKind: "fulfillment_dimension", score: 1, rationale: "Only a Gospel attests it.", confidence: 5 },
]);

describe("parseRows", () => {
  it("parses a clean array and stamps the claim slug", () => {
    const rows = parseRows(good, "some-claim");
    expect(rows).toHaveLength(2);
    expect(rows[0].claimSlug).toBe("some-claim");
    // Kind is resolved from the vocabulary, not trusted from the model.
    expect(rows[1].dimensionKind).toBe("fulfillment_dimension");
  });

  it("tolerates a code fence or leading prose", () => {
    expect(parseRows("Here you go:\n```json\n" + good + "\n```", "c")).toHaveLength(2);
  });

  it("drops unknown dimension keys", () => {
    const bad = JSON.stringify([{ dimensionKey: "vibes", score: 5, rationale: "x", confidence: 5 }]);
    expect(parseRows(bad, "c")).toHaveLength(0);
  });

  it("drops out-of-range scores and confidences", () => {
    const bad = JSON.stringify([
      { dimensionKey: "clarity", score: 9, rationale: "x", confidence: 3 },
      { dimensionKey: "specificity", score: 3, rationale: "x", confidence: 99 },
    ]);
    expect(parseRows(bad, "c")).toHaveLength(0);
  });

  it("drops rows with a blank rationale — an unexplained score is refused", () => {
    const bad = JSON.stringify([{ dimensionKey: "clarity", score: 3, rationale: "   ", confidence: 3 }]);
    expect(parseRows(bad, "c")).toHaveLength(0);
  });

  it("keeps the first of a duplicated dimension", () => {
    const dup = JSON.stringify([
      { dimensionKey: "clarity", score: 2, rationale: "first", confidence: 3 },
      { dimensionKey: "clarity", score: 5, rationale: "second", confidence: 3 },
    ]);
    const rows = parseRows(dup, "c");
    expect(rows).toHaveLength(1);
    expect(rows[0].rationale).toBe("first");
  });

  it("returns nothing for unparseable or non-array output", () => {
    expect(parseRows("I cannot rate this.", "c")).toHaveLength(0);
    expect(parseRows("[{broken", "c")).toHaveLength(0);
    expect(parseRows(JSON.stringify({ dimensionKey: "clarity" }), "c")).toHaveLength(0);
  });
});

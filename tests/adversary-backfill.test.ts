import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createdAtFromStamp,
  parseTranscriptBody,
  parseTranscriptFile,
} from "@/scripts/adversary-backfill";

// The backfill reads markdown that scripts/adversary.ts wrote, so these tests
// pin the two halves of that contract: the front-matter/body shape it emits,
// and the things the backfill must REFUSE to invent (mock runs, per-line
// tokens). The fixture below is byte-faithful to writeTranscript()'s template.

const FIXTURE = `---
persona: professor
label: "The trained apologist"
tier: standard
adversary_model: anthropic:claude-sonnet-4-5
sophistication: 5
verbosity: medium
hostility: civil
focus: mixed
turns: 2
input_tokens: 4210
output_tokens: 980
agent_avg_words: 132
agent_avg_sentences: 6
hook_violations: 1
trailing_questions: 2
multi_question_turns: 0
long_replies: 1
run: 2026-07-25_21-05-33
---

# Adversary eval — The trained apologist vs debate agent

### APOLOGIST (professor)

The kalam gives us a cause that is timeless and immaterial.

### DEBATE AGENT

"Cause" is doing a lot of unearned work there.

### APOLOGIST (professor)

Then what grounds the premise you reject?
`;

function withTmpFile<T>(contents: string, fn: (file: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adv-backfill-"));
  const file = path.join(dir, "2026-07-25_21-05-33-professor.md");
  fs.writeFileSync(file, contents, "utf8");
  try {
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("parseTranscriptBody", () => {
  it("splits the ### sections and attributes each to a speaker", () => {
    const lines = parseTranscriptBody(FIXTURE.split("---")[2]);
    expect(lines.map((l) => l.speaker)).toEqual(["adversary", "agent", "adversary"]);
    expect(lines[1].content).toBe(`"Cause" is doing a lot of unearned work there.`);
  });

  it("reports zero per-line tokens — the file never stored the split", () => {
    // Not an oversight: costing prices each speaker at its own model's rate, so
    // a guessed split would be a fabricated dollar figure. runCostAvailable()
    // reads exactly this shape to know the number is unknown.
    for (const l of parseTranscriptBody(FIXTURE.split("---")[2])) {
      expect(l.inTok).toBe(0);
      expect(l.outTok).toBe(0);
    }
  });

  it("ignores headings with no reply under them", () => {
    expect(parseTranscriptBody("### DEBATE AGENT\n\n")).toEqual([]);
  });

  it("returns nothing for a body with no sections", () => {
    expect(parseTranscriptBody("# Adversary eval\n\nno turns here")).toEqual([]);
  });

  it("keeps a reply's own ### headings inside the message", () => {
    // Replies are written verbatim, so a model that formats its answer with
    // headings must not be split into phantom turns — that would invent agent
    // replies and skew every turn-count metric.
    const lines = parseTranscriptBody(
      [
        "### DEBATE AGENT",
        "",
        "Two problems here.",
        "",
        "### First",
        "",
        "The premise is unearned.",
        "",
        "### APOLOGIST (professor)",
        "",
        "Then defend the alternative.",
      ].join("\n"),
    );
    expect(lines).toHaveLength(2);
    expect(lines[0].speaker).toBe("agent");
    expect(lines[0].content).toContain("### First");
    expect(lines[1].speaker).toBe("adversary");
  });

  it("only treats an exact delimiter line as a speaker change", () => {
    const lines = parseTranscriptBody(
      ["### DEBATE AGENT", "", "### DEBATE AGENT NOTES", "", "still me"].join("\n"),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].content).toContain("### DEBATE AGENT NOTES");
  });
});

describe("createdAtFromStamp", () => {
  it("recovers the run's real UTC time from the stamp", () => {
    expect(createdAtFromStamp("2026-07-25_21-05-33")?.toISOString()).toBe(
      "2026-07-25T21:05:33.000Z",
    );
  });

  it("rejects anything that isn't the harness's stamp format", () => {
    expect(createdAtFromStamp("2026-07-25")).toBeNull();
    expect(createdAtFromStamp("nonsense")).toBeNull();
  });
});

describe("parseTranscriptFile", () => {
  it("recovers every field the front-matter preserved", () => {
    const parsed = withTmpFile(FIXTURE, parseTranscriptFile);
    expect("error" in parsed || "skip" in parsed).toBe(false);
    if ("error" in parsed || "skip" in parsed) return;

    expect(parsed.persona).toBe("professor");
    expect(parsed.label).toBe("The trained apologist");
    expect(parsed.tier).toBe("standard");
    expect(parsed.adversaryModel).toBe("anthropic:claude-sonnet-4-5");
    expect(parsed.sophistication).toBe(5);
    expect(parsed.turns).toBe(2);
    expect(parsed.seed).toBeNull();
    // Totals ARE in the file, so they must survive intact — only the split is lost.
    expect(parsed.inputTokens).toBe(4210);
    expect(parsed.outputTokens).toBe(980);
    expect(parsed.runStamp).toBe("2026-07-25_21-05-33");
    expect(parsed.createdAt.toISOString()).toBe("2026-07-25T21:05:33.000Z");
    // agentTurns is recounted from the body; the rest come from front-matter.
    expect(parsed.metrics).toEqual({
      agentTurns: 1,
      agentAvgWords: 132,
      agentAvgSentences: 6,
      hookViolations: 1,
      trailingQuestions: 2,
      multiQuestionTurns: 0,
      longReplies: 1,
    });
  });

  it("skips mock runs rather than importing canned text as real data", () => {
    const mock = FIXTURE.replace("adversary_model: anthropic:claude-sonnet-4-5", "adversary_model: mock");
    const parsed = withTmpFile(mock, parseTranscriptFile);
    expect(parsed).toHaveProperty("skip");
  });

  it("errors instead of guessing when the identity fields are missing", () => {
    const noPersona = FIXTURE.replace("persona: professor\n", "");
    expect(withTmpFile(noPersona, parseTranscriptFile)).toHaveProperty("error");

    const noStamp = FIXTURE.replace("run: 2026-07-25_21-05-33\n", "");
    expect(withTmpFile(noStamp, parseTranscriptFile)).toHaveProperty("error");
  });

  it("errors on a file with front-matter but no conversation", () => {
    const empty = FIXTURE.slice(0, FIXTURE.indexOf("### APOLOGIST"));
    expect(withTmpFile(empty, parseTranscriptFile)).toHaveProperty("error");
  });

  it("keeps an optional seed when the run had one", () => {
    const seeded = FIXTURE.replace("turns: 2\n", 'turns: 2\nseed: "Prove God exists."\n');
    const parsed = withTmpFile(seeded, parseTranscriptFile);
    if ("error" in parsed || "skip" in parsed) throw new Error("expected a parse");
    expect(parsed.seed).toBe("Prove God exists.");
  });
});

import { describe, expect, it } from "vitest";
import {
  groupFindings,
  parseQaExport,
  severityRank,
  type QaFinding,
} from "@/lib/qaReports";

// Pure parsing/grouping rules for the /review/qa report archive. No DB —
// saveReport/getReport are thin Prisma wrappers over these.

function finding(over: Partial<QaFinding> = {}): QaFinding {
  return {
    url: "https://example.com/",
    pipeline: "security",
    rule: "missing-csp",
    severity: "serious",
    title: "Missing CSP",
    detail: "No CSP header.",
    evidence: { present: false },
    ...over,
  };
}

const VALID_EXPORT = JSON.stringify({
  exported_at: "2026-08-01T01:44:56.202Z",
  kind: "page",
  target: "https://example.com",
  run_id: "abc123",
  status: "done",
  stats: { pages: 3 },
  findings: [
    finding(),
    finding({ url: "https://example.com/a/", severity: "moderate", rule: "heading-order", pipeline: "wcag" }),
    finding({ url: "https://example.com/b/", severity: "info", rule: "lh-a11y", pipeline: "ux" }),
  ],
});

describe("parseQaExport", () => {
  it("parses a valid export with counts and metadata", () => {
    const p = parseQaExport(VALID_EXPORT);
    expect(p.runId).toBe("abc123");
    expect(p.kind).toBe("page");
    expect(p.target).toBe("https://example.com");
    expect(p.status).toBe("done");
    expect(p.pages).toBe(3);
    expect(p.exportedAt?.toISOString()).toBe("2026-08-01T01:44:56.202Z");
    expect(p.findings).toHaveLength(3);
    expect(p.counts).toEqual({ serious: 1, moderate: 1, minor: 0, info: 1 });
  });

  it("rejects non-JSON, non-objects, and payloads missing findings or run_id", () => {
    expect(() => parseQaExport("not json")).toThrow(/valid JSON/);
    expect(() => parseQaExport('"a string"')).toThrow(/object/);
    expect(() => parseQaExport('{"run_id":"x"}')).toThrow(/findings/);
    expect(() => parseQaExport('{"findings":[]}')).toThrow(/run_id/);
  });

  it("counts distinct URLs when stats.pages is absent", () => {
    const p = parseQaExport(
      JSON.stringify({
        run_id: "x",
        findings: [finding(), finding(), finding({ url: "https://example.com/other/" })],
      }),
    );
    expect(p.pages).toBe(2);
  });

  it("coerces unknown severities to info instead of dropping the finding", () => {
    const p = parseQaExport(
      JSON.stringify({ run_id: "x", findings: [finding({ severity: "catastrophic" as never })] }),
    );
    expect(p.findings[0].severity).toBe("info");
    expect(p.counts.info).toBe(1);
  });
});

describe("groupFindings", () => {
  it("collapses one issue across many pages into a single group", () => {
    const findings = [
      finding({ url: "https://example.com/" }),
      finding({ url: "https://example.com/a/" }),
      finding({ url: "https://example.com/b/" }),
    ];
    const groups = groupFindings(findings);
    expect(groups).toHaveLength(1);
    expect(groups[0].occurrences).toHaveLength(3);
  });

  it("keeps distinct rules separate and sorts worst severity first", () => {
    const groups = groupFindings([
      finding({ rule: "lh-perf", pipeline: "ux", severity: "moderate", title: "Perf 0.6" }),
      finding({ rule: "missing-csp", severity: "serious" }),
      finding({ rule: "server-version", severity: "minor" }),
    ]);
    expect(groups.map((g) => g.rule)).toEqual(["missing-csp", "lh-perf", "server-version"]);
  });

  it("wears the worst occurrence's severity and title when pages differ", () => {
    const groups = groupFindings([
      finding({ rule: "lh-perf", pipeline: "ux", severity: "moderate", title: "Perf 0.59" }),
      finding({
        rule: "lh-perf",
        pipeline: "ux",
        severity: "serious",
        title: "Perf 0.39",
        url: "https://example.com/slow/",
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].severity).toBe("serious");
    expect(groups[0].title).toBe("Perf 0.39");
    expect(groups[0].occurrences).toHaveLength(2);
  });

  it("does not merge the same rule name across different pipelines", () => {
    const groups = groupFindings([
      finding({ rule: "same", pipeline: "security" }),
      finding({ rule: "same", pipeline: "wcag" }),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("severityRank", () => {
  it("orders serious < moderate < minor < info and puts unknowns first", () => {
    expect(severityRank("serious")).toBeLessThan(severityRank("moderate"));
    expect(severityRank("moderate")).toBeLessThan(severityRank("minor"));
    expect(severityRank("minor")).toBeLessThan(severityRank("info"));
    expect(severityRank("brand-new-tier")).toBeLessThan(severityRank("serious"));
  });
});

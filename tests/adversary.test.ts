import { describe, expect, it } from "vitest";
import {
  PERSONAS,
  getPersona,
  personaNames,
  buildAdversaryPrompt,
  withDials,
  openerInstruction,
  ARGUMENTS,
  argumentKeys,
} from "@/lib/agent/adversary";

// The adversary persona library is pure (no model calls), so it's fully unit
// testable. These guard the invariants the harness relies on and the safety
// rails that keep the eval valid.

describe("persona catalog", () => {
  it("has unique, stable names and a full sophistication spread", () => {
    const names = personaNames();
    expect(new Set(names).size).toBe(names.length);
    const levels = new Set(PERSONAS.map((p) => p.dials.sophistication));
    // The spectrum should span low to high "mental capacity".
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(5);
  });

  it("resolves personas case-insensitively", () => {
    expect(getPersona("PROFESSOR")?.name).toBe("professor");
    expect(getPersona("nope")).toBeUndefined();
  });

  it("every persona's focus is a real argument key or 'mixed'", () => {
    const keys = argumentKeys();
    for (const p of PERSONAS) {
      const ok = p.dials.focus === "mixed" || keys.includes(p.dials.focus as never);
      expect(ok, `${p.name} focus=${p.dials.focus}`).toBe(true);
    }
  });
});

describe("buildAdversaryPrompt", () => {
  const prompt = buildAdversaryPrompt(getPersona("professor")!);

  it("embeds the character and the length/tone guidance", () => {
    expect(prompt).toContain("trained apologist");
    expect(prompt).toContain("Reasoning level: expert");
  });

  it("keeps the safety rails that keep the test valid", () => {
    // Must never claim to be a minor (would trip the agent's minor backstop).
    expect(prompt).toMatch(/ADULT/);
    // No slurs / harassment / meta-breaking.
    expect(prompt).toMatch(/slurs/i);
    expect(prompt).toMatch(/in character/i);
  });

  it("reflects dial overrides in the composed prompt", () => {
    const nasty = withDials(getPersona("seeker")!, {
      hostility: "sneering",
      verbosity: "terse",
      sophistication: 1,
    });
    const p = buildAdversaryPrompt(nasty);
    expect(p).toContain("smug and dismissive");
    expect(p).toContain("one or two short lines");
    expect(p).toContain("Reasoning level: very low");
  });

  it("names the anchored argument when focus is not mixed", () => {
    const p = buildAdversaryPrompt(getPersona("zealot")!);
    expect(p).toContain(ARGUMENTS.pascals_wager.label);
  });
});

describe("withDials", () => {
  it("overrides only the given dials and does not mutate the base", () => {
    const base = getPersona("everyman")!;
    const before = base.dials.sophistication;
    const tuned = withDials(base, { sophistication: 5 });
    expect(tuned.dials.sophistication).toBe(5);
    expect(tuned.dials.verbosity).toBe(base.dials.verbosity);
    expect(base.dials.sophistication).toBe(before); // untouched
  });
});

describe("openerInstruction", () => {
  it("appends a seed when given", () => {
    expect(openerInstruction()).not.toContain("Open specifically");
    expect(openerInstruction("the moral argument")).toContain("the moral argument");
  });
});

describe("argument catalog", () => {
  it("every entry has a label, gloss, and opener", () => {
    for (const [key, a] of Object.entries(ARGUMENTS)) {
      expect(a.label, key).toBeTruthy();
      expect(a.gloss, key).toBeTruthy();
      expect(a.opener, key).toBeTruthy();
    }
  });
});

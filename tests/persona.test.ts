import { describe, expect, it } from "vitest";
import { looksLikeMinor, minorRedirectMessage } from "@/lib/agent/persona";

// The in-code minor backstop is a safety layer in front of the model's own
// instruction (spec §4a). It only needs to catch obvious self-declarations —
// false negatives are backstopped by the model, but false positives on adults
// stating a debate position must be avoided.
describe("looksLikeMinor", () => {
  it("flags clear self-declared minors", () => {
    for (const s of [
      "I'm 14 and I think god exists",
      "im 12 years old",
      "I am 15",
      "I'm in 8th grade",
      "I'm a teenager btw",
      "my age is 16",
    ]) {
      expect(looksLikeMinor(s)).toBe(true);
    }
  });

  it("does not flag adults or unrelated numbers", () => {
    for (const s of [
      "I'm 34 and an atheist",
      "The universe is 13.8 billion years old",
      "I have 3 kids who are religious",
      "Aquinas made 5 arguments for god",
      "I've been an atheist for 20 years",
    ]) {
      expect(looksLikeMinor(s)).toBe(false);
    }
  });

  it("builds a redirect message pointing at the quiz", () => {
    expect(minorRedirectMessage("/quiz")).toContain("/quiz");
  });
});

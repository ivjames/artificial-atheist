import { describe, it, expect } from "vitest";
import { isAnswerCorrect, parseOptions, scoreLabel } from "@/lib/quiz";

describe("isAnswerCorrect", () => {
  it("is true only when the selected index matches", () => {
    expect(isAnswerCorrect(2, 2)).toBe(true);
    expect(isAnswerCorrect(0, 2)).toBe(false);
  });
});

describe("parseOptions", () => {
  it("parses a JSON string array", () => {
    expect(parseOptions('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns [] on malformed input", () => {
    expect(parseOptions("not json")).toEqual([]);
    expect(parseOptions("{}")).toEqual([]);
  });
});

describe("scoreLabel", () => {
  it("labels the full range", () => {
    expect(scoreLabel(3, 3)).toBe("Flawless!");
    expect(scoreLabel(4, 5)).toBe("Sharp mind");
    expect(scoreLabel(3, 5)).toBe("Not bad");
    expect(scoreLabel(1, 5)).toBe("Room to grow");
    expect(scoreLabel(0, 5)).toBe("Tough round");
    expect(scoreLabel(0, 0)).toBe("No questions");
  });
});

// Mirrors the submitResult scoring loop without a DB: score = count of matches.
describe("result scoring", () => {
  const questions = [
    { id: "q1", correctIndex: 2 },
    { id: "q2", correctIndex: 0 },
    { id: "q3", correctIndex: 1 },
  ];
  const score = (answers: { questionId: string; selectedIndex: number }[]) => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    return answers.reduce(
      (acc, a) =>
        acc + (isAnswerCorrect(a.selectedIndex, byId.get(a.questionId)!.correctIndex) ? 1 : 0),
      0,
    );
  };

  it("scores all correct", () => {
    expect(
      score([
        { questionId: "q1", selectedIndex: 2 },
        { questionId: "q2", selectedIndex: 0 },
        { questionId: "q3", selectedIndex: 1 },
      ]),
    ).toBe(3);
  });

  it("scores all wrong", () => {
    expect(
      score([
        { questionId: "q1", selectedIndex: 0 },
        { questionId: "q2", selectedIndex: 1 },
        { questionId: "q3", selectedIndex: 0 },
      ]),
    ).toBe(0);
  });

  it("scores a mix", () => {
    expect(
      score([
        { questionId: "q1", selectedIndex: 2 },
        { questionId: "q2", selectedIndex: 3 },
        { questionId: "q3", selectedIndex: 1 },
      ]),
    ).toBe(2);
  });
});

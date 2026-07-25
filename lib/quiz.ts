import type { Question } from "@prisma/client";

export type QuestionView = {
  id: string;
  text: string;
  options: string[];
  category: string;
  difficulty: string;
};

// Public shape sent to the client — never includes correctIndex/explanation
// so answers can't be scraped from the quiz payload.
export function toQuestionView(q: Question): QuestionView {
  return {
    id: q.id,
    text: q.text,
    options: parseOptions(q.options),
    category: q.category,
    difficulty: q.difficulty,
  };
}

export function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export type Source = { label: string; url: string };

export function parseSources(raw: string | null | undefined): Source[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.label === "string" && typeof s.url === "string")
      .map((s) => ({ label: s.label as string, url: s.url as string }));
  } catch {
    return [];
  }
}

// Scoring rule carried over from the original backend/routes/responses.js:
// an answer is correct iff selectedIndex === correctIndex.
export function isAnswerCorrect(selectedIndex: number, correctIndex: number): boolean {
  return selectedIndex === correctIndex;
}

export function scoreLabel(score: number, total: number): string {
  if (total === 0) return "No questions";
  const pct = score / total;
  if (pct === 1) return "Flawless!";
  if (pct >= 0.8) return "Sharp mind";
  if (pct >= 0.5) return "Not bad";
  if (pct > 0) return "Room to grow";
  return "Tough round";
}

"use server";

import { customAlphabet } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAnswerCorrect } from "@/lib/quiz";
import { isStance, stanceToFlags, type Stance } from "@/lib/stance";

// Short, unambiguous, URL-safe slug for shareable result links.
const makeSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export type SubmittedAnswer = { questionId: string; selectedIndex: number };

export type SubmitResultInput = {
  answers: SubmittedAnswer[];
  category?: string | null;
  difficulty?: string | null;
  stance?: Stance | null; // player type from the pre-quiz intake
};

// Re-scores server-side (never trusts the client), persists the attempt, and
// returns the shareable slug so the client can navigate to /result/[slug].
export async function submitResult(input: SubmitResultInput): Promise<{ slug: string }> {
  const { answers, category, difficulty } = input;
  // Only store a stance we recognize; otherwise leave the flags null.
  const flags = isStance(input.stance) ? stanceToFlags(input.stance) : null;

  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  const answerRows = answers
    .map((a) => {
      const q = byId.get(a.questionId);
      if (!q) return null;
      const correct = isAnswerCorrect(a.selectedIndex, q.correctIndex);
      if (correct) score += 1;
      return {
        questionId: q.id,
        selectedIndex: a.selectedIndex,
        isCorrect: correct,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const slug = makeSlug();
  await prisma.result.create({
    data: {
      slug,
      score,
      total: answerRows.length,
      category: category ?? null,
      difficulty: difficulty ?? null,
      atheist: flags?.atheist ?? null,
      agnostic: flags?.agnostic ?? null,
      answers: { create: answerRows },
    },
  });

  return { slug };
}

// Attaches a display name to a result so it shows on the leaderboard.
export async function claimLeaderboardName(
  slug: string,
  displayName: string,
): Promise<{ ok: boolean }> {
  const name = displayName.trim().slice(0, 30);
  if (!name) return { ok: false };

  await prisma.result.update({
    where: { slug },
    data: { displayName: name },
  });

  revalidatePath("/leaderboard");
  revalidatePath(`/result/${slug}`);
  return { ok: true };
}

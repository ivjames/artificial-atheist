import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toQuestionView } from "@/lib/quiz";
import QuizStart from "@/components/QuizStart";
import QuizRunner from "./QuizRunner";

const MAX_QUESTIONS = 10;

// Fisher–Yates shuffle (non-mutating).
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string; play?: string }>;
}) {
  const { category, difficulty, play } = await searchParams;

  // `/quiz` with no `play` flag is the start / mode-selection screen; StartForm
  // navigates to `/quiz?play=1&…` to actually run. This keeps the full quiz
  // experience reachable under artificialatheist.com path routing (§4a).
  if (!play) {
    return <QuizStart />;
  }

  const all = await prisma.question.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
  });

  // Shuffle so each play draws a fresh, varied set. This route is dynamic
  // (rendered per request via searchParams), so Math.random is fine here.
  const questions = shuffle(all).slice(0, MAX_QUESTIONS).map(toQuestionView);

  if (questions.length === 0) {
    return (
      <div className="card mt-10 p-8 text-center">
        <h1 className="text-xl font-bold">No questions match that filter</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Try a different category or difficulty.
        </p>
        <Link href="/quiz" className="btn-primary mt-6">
          Back to start
        </Link>
      </div>
    );
  }

  return (
    <QuizRunner
      questions={questions}
      category={category ?? null}
      difficulty={difficulty ?? null}
    />
  );
}

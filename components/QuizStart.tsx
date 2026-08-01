import { prisma } from "@/lib/prisma";
import StartForm from "@/components/StartForm";

// The quiz start / mode-selection screen. Shared by the app root (`/`, used on
// the legacy atheismiq.lab980.com host) and the `/quiz` landing, so the full
// mode picker stays reachable under artificialatheist.com path routing — where
// `/` is the static site and the quiz is mounted at `/quiz`.
export default async function QuizStart() {
  const questions = await prisma.question.findMany({
    select: { category: true, difficulty: true },
  });

  const categories = Array.from(new Set(questions.map((q) => q.category))).sort();
  const difficulties = ["Easy", "Medium", "Hard"].filter((d) =>
    questions.some((q) => q.difficulty === d),
  );

  return (
    <div className="animate-fade-in-up">
      <section className="card p-8 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
          How many myths about atheism do you{" "}
          <span className="text-brand-600 dark:text-brand-300">still believe</span>?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-500 dark:text-slate-400">
          A quick quiz on the common misconceptions and false assumptions about
          atheism. Answer, get scored, and see the facts — then share your result.
        </p>

        <div className="mt-8">
          <StartForm categories={categories} difficulties={difficulties} />
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          {questions.length} questions · every answer comes with a sourced explanation
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseOptions, parseSources, scoreLabel } from "@/lib/quiz";
import ScoreRing from "@/components/ScoreRing";
import ShareBar from "@/components/ShareBar";
import ClaimName from "@/components/ClaimName";
import Explanation from "@/components/Explanation";
import StanceReveal from "@/components/StanceReveal";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atheismiq.lab980.com";

async function getResult(slug: string) {
  return prisma.result.findUnique({
    where: { slug },
    include: { answers: { include: { question: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResult(slug);
  if (!result) return { title: "Result not found" };

  const title = `I scored ${result.score}/${result.total} on AtheismIQ`;
  const description = `${scoreLabel(result.score, result.total)} — think you can beat it?`;
  return {
    title,
    description,
    openGraph: { title, description, url: `/result/${slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getResult(slug);
  if (!result) notFound();

  const shareUrl = `${siteUrl}/result/${slug}`;

  return (
    <div className="animate-fade-in-up">
      {/* Summary */}
      <section className="card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={result.score} total={result.total} />
          <div>
            <h1 className="font-display text-2xl font-medium">{scoreLabel(result.score, result.total)}</h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              You got {result.score} of {result.total} correct.
            </p>
          </div>
        </div>

        <ShareBar url={shareUrl} score={result.score} total={result.total} />

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <ClaimName slug={slug} initialName={result.displayName} />
        </div>
      </section>

      {/* Where they stand — revealed from the pre-quiz intake */}
      <StanceReveal />

      {/* Answer review */}
      <section className="mt-6">
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Review
        </h2>
        <div className="flex flex-col gap-3">
          {result.answers.map((a) => {
            const options = parseOptions(a.question.options);
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{a.question.text}</p>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold " +
                      (a.isCorrect
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300")
                    }
                  >
                    {a.isCorrect ? "Correct" : "Wrong"}
                  </span>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {options.map((opt, i) => {
                    const isCorrect = i === a.question.correctIndex;
                    const isPicked = i === a.selectedIndex;
                    return (
                      <li
                        key={i}
                        className={
                          "rounded-lg px-3 py-2 " +
                          (isCorrect
                            ? "bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                            : isPicked
                              ? "bg-rose-50 text-rose-800 line-through dark:bg-rose-900/20 dark:text-rose-200"
                              : "text-slate-500 dark:text-slate-400")
                        }
                      >
                        {opt}
                        {isPicked && !isCorrect ? "  — your pick" : ""}
                        {isCorrect ? "  ✓" : ""}
                      </li>
                    );
                  })}
                </ul>
                {a.question.explanation ? (
                  <Explanation
                    explanation={a.question.explanation}
                    detail={a.question.detail}
                    sources={parseSources(a.question.sources)}
                    questionText={a.question.text}
                    correctAnswer={options[a.question.correctIndex]}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/quiz" className="btn-primary">
          Play again
        </Link>
        <Link href="/leaderboard" className="btn-ghost">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}

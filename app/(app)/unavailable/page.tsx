import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAT_ENABLED } from "@/lib/config";

// Shown when the region gate declines a visitor (middleware.ts redirects here).
// Not itself gated by region — that would loop — but gated by CHAT_ENABLED so
// it 404s while the chat surface is dark, like the rest of the chat pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Not available in your region",
  robots: { index: false, follow: false },
};

export default function UnavailablePage() {
  if (!CHAT_ENABLED) notFound();
  return (
    <article className="card mx-auto mt-10 max-w-lg p-8">
      <h1 className="text-2xl font-black">Not available in your region</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-300">
        The debate agent isn&rsquo;t available where you are right now. We
        currently offer it only in a limited set of regions while we complete
        the data-protection work needed to serve everyone properly.
      </p>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Nothing was collected from you. In the meantime, you&rsquo;re welcome to
        take the quiz, which is open to everyone.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/quiz"
          className="inline-block rounded bg-[#185FA5] px-5 py-2.5 font-semibold text-white"
        >
          Take the quiz
        </Link>
        <Link
          href="/privacy"
          className="inline-block rounded border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
        >
          Why?
        </Link>
      </div>
    </article>
  );
}

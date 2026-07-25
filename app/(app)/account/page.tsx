export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { CHAT_ENABLED, credits } from "@/lib/config";
import { isPreviewMode } from "@/lib/preview";
import { getCurrentUser } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { hasConsent } from "@/lib/consent";
import { setArticleConsent, deleteMyAccount, logout, devTopUp } from "./actions";

export default async function AccountPage() {
  if (!CHAT_ENABLED) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  const [balance, articleConsentOn] = await Promise.all([
    getBalance(user.id),
    hasConsent(user.id, "article_use"),
  ]);

  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col gap-6">
      <div className="card p-8">
        <h1 className="text-xl font-bold">Your account</h1>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Credit balance</dt>
            <dd className="font-medium">{balance}</dd>
          </div>
        </dl>
        <a href="/pricing" className="btn-primary mt-6 block w-full py-3 text-center">
          Buy more credits →
        </a>
        {isPreviewMode() && balance <= credits.lowBalanceThreshold ? (
          <form action={devTopUp} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-xl border border-dashed border-amber-400/70 py-2.5 text-sm font-semibold text-amber-600 dark:border-amber-500/50 dark:text-amber-500"
            >
              + Add 100 test credits (preview)
            </button>
          </form>
        ) : null}
      </div>

      <div className="card p-8">
        <h2 className="text-lg font-bold">Article-use consent</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          When on, your anonymized conversations may be used to help write
          articles. This is optional, revocable anytime, and has no effect on
          your access or credit balance.
        </p>
        <p className="mt-3 text-sm">
          Currently:{" "}
          <span className={articleConsentOn ? "font-semibold text-brand-600" : "font-semibold text-slate-500"}>
            {articleConsentOn ? "on" : "off"}
          </span>
        </p>
        <form action={setArticleConsent.bind(null, !articleConsentOn)} className="mt-4">
          <button type="submit" className={articleConsentOn ? "btn-ghost w-full py-2.5" : "btn-primary w-full py-2.5"}>
            {articleConsentOn ? "Turn off" : "Turn on"}
          </button>
        </form>
      </div>

      <div className="card border-red-200 p-8 dark:border-red-900/60">
        <h2 className="text-lg font-bold text-red-600">Delete my account</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Permanently erases your conversations, consents, and profile.
          Remaining credits are forfeited. This cannot be undone.
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-red-600">
            I understand — show the delete button
          </summary>
          <form action={deleteMyAccount} className="mt-3">
            <button type="submit" className="btn w-full bg-red-600 py-3 text-white hover:bg-red-700">
              Delete my account and all my data
            </button>
          </form>
        </details>
      </div>

      <form action={logout}>
        <button type="submit" className="btn-ghost w-full py-3">
          Sign out
        </button>
      </form>
    </div>
  );
}

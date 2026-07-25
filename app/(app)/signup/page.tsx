export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { CHAT_ENABLED } from "@/lib/config";
import { isPreviewMode } from "@/lib/preview";
import { getCurrentUser } from "@/lib/auth/session";
import { submitSignup, devLogin } from "./actions";

// The contact gate (§4 access flow). Collects an email + Terms agreement
// (required) and a separate, optional article-use consent (§6 unbundled —
// the copy makes clear access never depends on the optional box). Submission
// is a plain server-action form post; the "check your email" state is driven
// entirely by the ?sent=1 redirect so no client JS is needed.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  if (!CHAT_ENABLED) notFound();

  const user = await getCurrentUser();
  if (user) redirect("/chat");

  const { sent, error } = await searchParams;

  if (sent === "1") {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          If that address is valid, we&apos;ve sent a one-time sign-in link.
          Click it within 30 minutes to verify your email and unlock your
          free questions.
        </p>
      </div>
    );
  }

  const errorMessage =
    error === "terms"
      ? "You must confirm you're 18+ and agree to the Terms to continue."
      : error === "invalid"
        ? "Enter a valid email address."
        : error === "rate"
          ? "Too many sign-in attempts. Please wait a little while and try again."
          : error === "expired"
            ? "That sign-in link has expired or was already used. Request a new one."
            : null;

  return (
    <div className="card mx-auto mt-10 max-w-md p-8">
      <h1 className="text-xl font-bold">Sign in to debate</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Enter your email and we&apos;ll send a one-time link — no password
        needed.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <form action={submitSignup} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
          />
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agreeTerms" required className="mt-0.5" />
          <span>
            I am 18+ and agree to the Terms of Service.{" "}
            <strong>(Required)</strong>
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" name="articleUseConsent" className="mt-0.5" />
          <span>
            Optionally, allow my anonymized conversations to help write
            articles — <strong>not required for access</strong>, and
            revocable anytime from your account. <strong>(Optional)</strong>
          </span>
        </label>

        <button type="submit" className="btn-primary mt-2 w-full py-3 text-base">
          Send my sign-in link →
        </button>
      </form>

      {isPreviewMode() ? (
        <form
          action={devLogin}
          className="mt-6 rounded-xl border border-dashed border-amber-400/70 p-4 dark:border-amber-500/50"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Preview mode — dev sign-in
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Skips the email step — enter any address and go straight into the
            chat. Only works while the preview lock is on; it disappears at
            public launch.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700"
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap px-4 py-2 text-sm"
            >
              Dev sign-in →
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

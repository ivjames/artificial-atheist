import Link from "next/link";
import type { Banner } from "./types";

const BASE = "mt-3 rounded-xl border p-3 text-sm";

export default function StatusBanner({
  banner,
  onStartFreshThread,
}: {
  banner: Banner;
  onStartFreshThread: () => void;
}) {
  if (banner.kind === "minor") {
    return (
      <div
        className={`${BASE} border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200`}
      >
        <p>{banner.message}</p>
        <Link href="/quiz" className="btn-primary mt-2 inline-flex">
          Go to the quiz →
        </Link>
      </div>
    );
  }

  if (banner.kind === "capped") {
    return (
      <div
        className={`${BASE} border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200`}
      >
        <p>This thread has used up its token budget. Start a fresh thread to keep debating.</p>
        <button type="button" onClick={onStartFreshThread} className="btn-primary mt-2">
          Start a fresh thread
        </button>
      </div>
    );
  }

  if (banner.kind === "closed") {
    return (
      <div
        className={`${BASE} border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200`}
      >
        <p>This conversation has ended — it's read-only. Start a new chat to keep debating.</p>
        <button type="button" onClick={onStartFreshThread} className="btn-primary mt-2">
          New chat
        </button>
      </div>
    );
  }

  if (banner.kind === "need_credits") {
    return (
      <div
        className={`${BASE} border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-100`}
      >
        <p>
          You need {banner.required} credit{banner.required === 1 ? "" : "s"} for this message —
          you have {banner.balance}.
        </p>
        <Link href="/pricing" className="btn-primary mt-2 inline-flex">
          Get more credits →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`${BASE} border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200`}
    >
      <p>{banner.message}</p>
    </div>
  );
}

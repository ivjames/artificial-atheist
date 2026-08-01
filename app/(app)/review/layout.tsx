import { adminToken } from "./pipeline/auth";

// Operator chrome for every /review surface.
//
// These are internal tools with no entry point anywhere else on the site — not
// in the masthead, not in lib/site.ts — which is correct (they're admin-gated,
// not public). What was NOT correct is that they had no entry point from each
// other either: knowing a tool existed meant remembering its URL. A tool you
// can't navigate to is a tool that doesn't get used.
//
// Rendered on every page under /review, including the sign-in forms, so the
// other tools are reachable from wherever you land. It only shows when an
// ADMIN_TOKEN is configured — with none set, the pages themselves 404 and
// advertising them would be noise.

const TOOLS: Array<{ href: string; label: string; blurb: string }> = [
  { href: "/review/pipeline/", label: "Pipeline", blurb: "Article drafts awaiting review" },
  { href: "/review/prophecy/", label: "Prophecy", blurb: "Claims, sources, evaluations" },
  { href: "/review/adversary/", label: "Adversary", blurb: "Debate-agent eval runs" },
  { href: "/review/qa/", label: "QA", blurb: "Saved site-QA scan reports" },
];

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  if (!adminToken()) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Admin tools"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 pb-3 text-sm dark:border-slate-800"
      >
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Admin
        </span>
        {TOOLS.map((t) => (
          <a
            key={t.href}
            href={t.href}
            title={t.blurb}
            className="rounded-lg px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {t.label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}

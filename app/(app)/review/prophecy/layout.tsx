import { adminToken } from "../pipeline/auth";

// Second-level nav for the prophecy module. It has six surfaces and, until
// this existed, the only way between them was the dashboard — so a page like
// the claims index (where bulk publishing lives) was effectively hidden behind
// remembering its URL.
//
// The order is the working order: what you have (sources → lists) before what
// you made of it (claims → evaluations), with the raw dump last.

const SECTIONS: Array<{ href: string; label: string }> = [
  { href: "/review/prophecy/", label: "Dashboard" },
  { href: "/review/prophecy/sources/", label: "Sources" },
  { href: "/review/prophecy/lists/", label: "Source lists" },
  { href: "/review/prophecy/claims/", label: "Claims" },
  { href: "/review/prophecy/evaluations/", label: "Evaluations" },
  { href: "/review/prophecy/export/?format=json", label: "Export" },
];

export default function ProphecyReviewLayout({ children }: { children: React.ReactNode }) {
  if (!adminToken()) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Prophecy sections"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:border-brand-400 hover:text-brand-600 dark:border-slate-800 dark:text-slate-300"
          >
            {s.label}
          </a>
        ))}
        {/* The public counterpart, so it's obvious what a visitor actually
            sees — which is nothing until claims are published. */}
        <a
          href="/prophecy/"
          className="ml-auto rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400"
        >
          View public site ↗
        </a>
      </nav>
      {children}
    </div>
  );
}

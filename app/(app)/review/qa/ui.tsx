import type { QaSeverity } from "@/lib/qaReports";

// Shared presentational bits for the QA report pages (index + detail).

const SEVERITY_STYLES: Record<QaSeverity, string> = {
  serious: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  minor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  info: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function SeverityBadge({ severity }: { severity: QaSeverity }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info}`}
    >
      {severity}
    </span>
  );
}

// Compact "31 serious · 18 moderate · …" strip; zero-count tiers are dropped.
export function SeverityCounts({
  serious,
  moderate,
  minor,
  info,
}: {
  serious: number;
  moderate: number;
  minor: number;
  info: number;
}) {
  const parts: Array<[number, QaSeverity]> = [
    [serious, "serious"],
    [moderate, "moderate"],
    [minor, "minor"],
    [info, "info"],
  ];
  const shown = parts.filter(([n]) => n > 0);
  if (!shown.length) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">no findings</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {shown.map(([n, sev]) => (
        <span
          key={sev}
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[sev]}`}
        >
          {n} {sev}
        </span>
      ))}
    </span>
  );
}

export function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

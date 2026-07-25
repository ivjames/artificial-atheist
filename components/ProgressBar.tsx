export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
        <span>
          Question {Math.min(current + 1, total)} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total === 0 ? 0 : score / total;
  const size = 132;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-brand-600 transition-[stroke-dashoffset] duration-700 dark:stroke-brand-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-medium">{score}</span>
        <span className="text-xs font-medium text-slate-400">of {total}</span>
      </div>
    </div>
  );
}

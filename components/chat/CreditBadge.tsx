export default function CreditBadge({ balance }: { balance: number }) {
  return (
    <div className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
      {balance} credit{balance === 1 ? "" : "s"}
    </div>
  );
}

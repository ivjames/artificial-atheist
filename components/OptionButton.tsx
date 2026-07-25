export default function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition " +
        (selected
          ? "border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-100"
          : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50")
      }
    >
      <span
        className={
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] " +
          (selected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 dark:border-slate-600")
        }
      >
        {selected ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

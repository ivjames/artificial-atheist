import type { ChatMessage } from "./types";

export default function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
          (isUser
            ? "bg-brand-600 text-white"
            : "border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100") +
          (message.failed ? " opacity-60" : "")
        }
      >
        {message.content}
        {message.failed && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 underline underline-offset-2"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

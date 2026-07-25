"use client";

import { useRef, useState, useTransition } from "react";
import { postMessage, closeThread, loadThread, reloadTestCredits } from "./actions";
import type { ChatResult, ChatTier } from "@/lib/agent/chat";
import type { TurnEconomics } from "@/lib/pricing";
import type { ChatMessage, Banner, ThreadSummary, EconTotals } from "@/components/chat/types";
import MessageBubble from "@/components/chat/MessageBubble";
import CreditBadge from "@/components/chat/CreditBadge";
import TierToggle from "@/components/chat/TierToggle";
import StatusBanner from "@/components/chat/StatusBanner";
import ChatHistory from "@/components/chat/ChatHistory";

const ZERO_ECON: EconTotals = {
  turns: 0,
  inputTokens: 0,
  outputTokens: 0,
  refInputTokens: 0,
  costUsd: 0,
  refCostUsd: 0,
  revenueUsd: 0,
  profitUsd: 0,
};

// Fold one turn's economics into a running total.
function addEcon(t: EconTotals, e: TurnEconomics): EconTotals {
  return {
    turns: t.turns + 1,
    inputTokens: t.inputTokens + e.inputTokens,
    outputTokens: t.outputTokens + e.outputTokens,
    refInputTokens: t.refInputTokens + e.refInputTokens,
    costUsd: t.costUsd + e.costUsd,
    refCostUsd: t.refCostUsd + e.refCostUsd,
    revenueUsd: t.revenueUsd + e.revenueUsd,
    profitUsd: t.profitUsd + e.profitUsd,
  };
}

export default function ChatClient({
  initialThreadId,
  initialTier,
  initialMessages,
  initialBalance,
  initialHistory = [],
  costs,
  previewMode = false,
  lowBalanceThreshold = 0,
}: {
  initialThreadId: string | null;
  initialTier: ChatTier;
  initialMessages: ChatMessage[];
  initialBalance: number;
  initialHistory?: ThreadSummary[];
  costs: { standard: number; premium: number };
  previewMode?: boolean;
  lowBalanceThreshold?: number;
}) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [tier, setTier] = useState<ChatTier>(initialTier);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [balance, setBalance] = useState(initialBalance);
  const [history, setHistory] = useState<ThreadSummary[]>(initialHistory);
  const [readOnly, setReadOnly] = useState(false); // viewing a closed thread
  const [input, setInput] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [locked, setLocked] = useState(false); // set once the "minor" backstop fires
  const [lastEcon, setLastEcon] = useState<TurnEconomics | null>(null);
  // Per-conversation total — resets to zero on a new chat, and is restored from
  // the server when an existing thread is reopened.
  const [threadEcon, setThreadEcon] = useState<EconTotals>(ZERO_ECON);
  // Session total — accumulates across every conversation this session; never
  // reset by navigation.
  const [econTotal, setEconTotal] = useState<EconTotals>(ZERO_ECON);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  // Insert-or-update a thread's row in the history list and float it to the
  // top. `title` is only used when the thread is new to the list (its opening
  // message); an existing row keeps its title. Ordering is by updatedAt, which
  // we bump to now on every turn so the active conversation stays first.
  const upsertHistory = (
    id: string,
    { title, closed }: { title: string; closed: boolean },
  ) => {
    const now = new Date().toISOString();
    setHistory((prev) => {
      const existing = prev.find((t) => t.id === id);
      const row: ThreadSummary = existing
        ? { ...existing, closed, updatedAt: now, messageCount: existing.messageCount + 2 }
        : { id, title, tier, closed, updatedAt: now, messageCount: 2 };
      return [row, ...prev.filter((t) => t.id !== id)];
    });
  };

  const markHistoryClosed = (id: string) => {
    setHistory((prev) => prev.map((t) => (t.id === id ? { ...t, closed: true } : t)));
  };

  // §4: a thread's tier is fixed at creation. Changing tier while a thread is
  // active means the burn is transparent — it starts a brand-new thread
  // rather than silently upgrading the current one.
  const changeTier = (next: ChatTier) => {
    if (next === tier || pending || locked) return;
    if (threadId || messages.length > 0 || readOnly) {
      setThreadId(null);
      setMessages([]);
      setBanner(null);
      setReadOnly(false);
      setThreadEcon(ZERO_ECON);
    }
    setTier(next);
  };

  const applyResult = (result: ChatResult, userMsgId: string, sentContent: string) => {
    switch (result.status) {
      case "ok": {
        setThreadId(result.threadId);
        setBalance(result.balance);
        upsertHistory(result.threadId, { title: sentContent, closed: result.closed });
        if (result.economics) {
          const e = result.economics;
          setLastEcon(e);
          setThreadEcon((t) => addEcon(t, e));
          setEconTotal((t) => addEcon(t, e));
        }
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: result.assistant },
        ]);
        if (result.closed) {
          // Thread just crossed its token budget — prompt a deliberate reset
          // rather than silently opening a new thread underneath the user.
          setBanner({ kind: "capped" });
        }
        scrollToBottom();
        return;
      }
      case "minor": {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: result.assistant },
        ]);
        setBanner({ kind: "minor", message: result.assistant });
        setLocked(true);
        scrollToBottom();
        return;
      }
      case "capped": {
        setThreadId(result.threadId);
        markHistoryClosed(result.threadId);
        setBanner({ kind: "capped" });
        return;
      }
      case "need_credits": {
        setBanner({ kind: "need_credits", required: result.required, balance: result.balance });
        setMessages((prev) => prev.map((m) => (m.id === userMsgId ? { ...m, failed: true } : m)));
        return;
      }
      case "error": {
        setBanner({ kind: "error", message: result.message });
        setMessages((prev) => prev.map((m) => (m.id === userMsgId ? { ...m, failed: true } : m)));
        return;
      }
    }
  };

  const send = (content: string, retryId?: string) => {
    setBanner(null);
    const userMsgId = retryId ?? crypto.randomUUID();
    setMessages((prev) =>
      retryId
        ? prev.map((m) => (m.id === retryId ? { ...m, failed: false } : m))
        : [...prev, { id: userMsgId, role: "user", content }],
    );
    scrollToBottom();

    startTransition(async () => {
      const result = await postMessage(threadId, content, tier);
      applyResult(result, userMsgId, content);
    });
  };

  const submit = () => {
    const content = input.trim();
    if (!content || pending || locked || readOnly || banner?.kind === "capped") return;
    setInput("");
    send(content);
  };

  const retry = (msg: ChatMessage) => {
    if (pending || locked || readOnly || banner?.kind === "capped") return;
    send(msg.content, msg.id);
  };

  const startFreshThread = () => {
    setThreadId(null);
    setMessages([]);
    setBanner(null);
    setReadOnly(false);
    setLocked(false);
    setLastEcon(null);
    setThreadEcon(ZERO_ECON); // per-conversation total resets; session total is untouched
  };

  // Open a past conversation from the history panel. Loads its transcript
  // server-side (ownership-scoped) and drops the user into it — resumable if
  // still open, read-only if it already ended.
  const openThread = (id: string) => {
    if (pending || id === threadId) return;
    setBanner(null);
    setInput("");
    setLocked(false);
    startTransition(async () => {
      const detail = await loadThread(id);
      if (!detail) {
        // Vanished or not ours — drop it from the list and reset to a new chat.
        setHistory((prev) => prev.filter((t) => t.id !== id));
        startFreshThread();
        return;
      }
      setThreadId(detail.id);
      setTier(detail.tier);
      setMessages(detail.messages);
      setReadOnly(detail.closed);
      setBanner(detail.closed ? { kind: "closed" } : null);
      // Restore this thread's real accumulated economics; clear the stale
      // "last turn" (it belonged to a different conversation). The session
      // total keeps running.
      setThreadEcon(detail.economics);
      setLastEcon(null);
      scrollToBottom();
    });
  };

  // "New chat" — reset to an empty conversation without closing the current
  // one (the current thread stays in history, still resumable).
  const newChat = () => {
    if (pending) return;
    startFreshThread();
    setInput("");
  };

  // Explicit "end chat": close the thread server-side, then reset to a fresh,
  // empty chat. Available whenever there's an active conversation.
  const endChat = () => {
    if (pending) return;
    const id = threadId;
    startFreshThread();
    setInput("");
    if (id) {
      markHistoryClosed(id);
      startTransition(() => closeThread(id));
    }
  };

  const hasActiveChat = threadId !== null || messages.length > 0;

  // Preview-only credit reload for testing.
  const reloadCredits = () => {
    if (pending) return;
    startTransition(async () => {
      const next = await reloadTestCredits();
      if (next >= 0) {
        setBalance(next);
        if (banner?.kind === "need_credits") setBanner(null);
      }
    });
  };

  const sendDisabled =
    locked || readOnly || pending || !input.trim() || banner?.kind === "capped";

  const fmtUsd = (n: number) => `$${n.toFixed(Math.abs(n) >= 0.01 ? 4 : 6)}`;
  const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  // Profit margin = profit / revenue. Undefined without revenue (0 turns).
  const fmtMargin = (revenueUsd: number, profitUsd: number) =>
    revenueUsd > 0 ? `${((profitUsd / revenueUsd) * 100).toFixed(0)}%` : "—";
  const profitClass = (n: number) =>
    n >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500";

  // One row of the preview economics table. Accepts either a single turn or an
  // accumulated total (both share the numeric fields used here).
  const econRow = (
    label: string,
    e: {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      revenueUsd: number;
      profitUsd: number;
    },
  ) => (
    <>
      <span className="text-slate-500 dark:text-slate-300">{label}</span>
      <span className="text-right tabular-nums">
        {fmtTok(e.inputTokens)}/{fmtTok(e.outputTokens)}
      </span>
      <span className="text-right tabular-nums">{fmtUsd(e.costUsd)}</span>
      <span className="text-right tabular-nums">{fmtUsd(e.revenueUsd)}</span>
      <span className={`text-right tabular-nums ${profitClass(e.profitUsd)}`}>
        {fmtUsd(e.profitUsd)}
      </span>
      <span className={`text-right tabular-nums ${profitClass(e.profitUsd)}`}>
        {fmtMargin(e.revenueUsd, e.profitUsd)}
      </span>
    </>
  );

  const showEcon = previewMode && (lastEcon !== null || threadEcon.turns > 0 || econTotal.turns > 0);
  // Reference-library overhead to footnote (prefer the conversation total).
  const refEcon = threadEcon.turns > 0 ? threadEcon : econTotal;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <ChatHistory
        history={history}
        activeId={threadId}
        disabled={pending}
        onOpen={openThread}
        onNew={newChat}
      />

      <div className="flex h-[60vh] min-h-[380px] max-h-[600px] w-full min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <TierToggle tier={tier} costs={costs} onChange={changeTier} disabled={pending || locked} />
        <div className="flex items-center gap-3">
          {previewMode && balance <= lowBalanceThreshold ? (
            <button
              type="button"
              onClick={reloadCredits}
              disabled={pending}
              title="Add 100 test credits (preview)"
              className="rounded-lg border border-dashed border-amber-400/70 px-3 py-1.5 text-xs font-semibold text-amber-600 disabled:opacity-50 dark:border-amber-500/50 dark:text-amber-500"
            >
              + Reload credits
            </button>
          ) : null}
          {hasActiveChat && !readOnly ? (
            <button
              type="button"
              onClick={endChat}
              disabled={pending}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
            >
              End chat
            </button>
          ) : null}
          <CreditBadge balance={balance} />
        </div>
      </div>

      {/* Input at the TOP so it's always in view — no hunting to the bottom. */}
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={locked || readOnly || pending || banner?.kind === "capped"}
          placeholder={
            locked || readOnly ? "This conversation has ended." : "Type your argument…"
          }
          rows={2}
          aria-label="Message"
          className="flex-1 resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
        />
        <button type="submit" className="btn-primary self-end" disabled={sendDisabled}>
          {pending ? "Sending…" : "Send"}
        </button>
      </form>

      {banner ? <StatusBanner banner={banner} onStartFreshThread={startFreshThread} /> : null}

      <div ref={listRef} className="card flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">
            Make a claim or ask a question — the agent argues from an evidence-first,
            naturalist position.
          </p>
        ) : null}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={m.failed ? () => retry(m) : undefined} />
        ))}
      </div>

      {showEcon ? (
        <div className="mt-2 rounded-lg border border-dashed border-amber-400/60 px-3 py-2 text-[11px] text-slate-500 dark:border-amber-500/40 dark:text-slate-400">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
              Preview economics
            </span>
            {lastEcon ? (
              <span className="font-mono text-[10px] text-slate-400">{lastEcon.model}</span>
            ) : null}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-1 font-mono">
            <span className="text-[10px] uppercase tracking-wide text-slate-400" />
            <span className="text-right text-[10px] uppercase tracking-wide text-slate-400">
              in/out
            </span>
            <span className="text-right text-[10px] uppercase tracking-wide text-slate-400">
              cost
            </span>
            <span className="text-right text-[10px] uppercase tracking-wide text-slate-400">
              rev
            </span>
            <span className="text-right text-[10px] uppercase tracking-wide text-slate-400">
              profit
            </span>
            <span className="text-right text-[10px] uppercase tracking-wide text-slate-400">
              margin
            </span>
            {lastEcon ? econRow("last turn", lastEcon) : null}
            {threadEcon.turns > 0 ? econRow(`conversation (${threadEcon.turns})`, threadEcon) : null}
            {econTotal.turns > 0 ? econRow(`session (${econTotal.turns})`, econTotal) : null}
          </div>
          {refEcon.refInputTokens > 0 ? (
            <div className="mt-1.5 border-t border-amber-400/20 pt-1.5 text-[10px] text-slate-400 dark:border-amber-500/20">
              includes {fmtTok(refEcon.refInputTokens)} article-reference tokens
              ({fmtUsd(refEcon.refCostUsd)}) — platform overhead, folded into cost but
              not counted against the visitor&rsquo;s tokens or budget
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </div>
  );
}

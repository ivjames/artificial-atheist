// Shared shapes for the chat UI subcomponents (components/chat/*) and
// app/chat/ChatClient.tsx.

// Kept inline (rather than imported from lib/agent/chat) so this pure-types
// module stays free of any server-only import graph — it's consumed by client
// components and by the server-side history layer alike.
export type ChatTier = "standard" | "premium";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  // Set locally when a turn's server round-trip failed (need_credits/error) so
  // the bubble can offer a retry instead of silently vanishing.
  failed?: boolean;
};

export type Banner =
  | { kind: "minor"; message: string }
  | { kind: "capped" }
  | { kind: "need_credits"; required: number; balance: number }
  | { kind: "error"; message: string }
  // Viewing a past conversation that has already ended (closed thread). Read
  // only — the user can start a new chat but can't add to this one.
  | { kind: "closed" };

// One row in the per-user chat-history list. Lightweight summary of a Thread.
export type ThreadSummary = {
  id: string;
  title: string; // opening user message, truncated
  tier: ChatTier;
  closed: boolean;
  updatedAt: string; // ISO timestamp of the most recent message
  messageCount: number;
};

// Accumulated economics for the preview cost/profit readout — a running total
// over some set of turns (one thread, or the whole session).
export type EconTotals = {
  turns: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  revenueUsd: number;
  profitUsd: number;
};

// A single past conversation loaded for viewing/resuming. `economics` is the
// thread's real accumulated cost/profit, recomputed from its persisted
// per-turn token counts — so reopening a test thread shows its true total even
// in a later session, not just the turns run live this session.
export type ThreadDetail = {
  id: string;
  tier: ChatTier;
  closed: boolean;
  messages: ChatMessage[];
  economics: EconTotals;
};

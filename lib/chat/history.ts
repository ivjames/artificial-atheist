// Per-user chat history (§4 threads are already persisted per user; this is
// the read side that lets a signed-in user browse and reopen past debates).
// Ownership is enforced on every query — a thread is only ever returned for the
// user that owns it. Redacted messages (post-erasure) are excluded, so an
// erased conversation never resurfaces as content.

import { prisma } from "@/lib/prisma";
import { modelCostUsd, creditUnitPriceUsd } from "@/lib/pricing";
import { costForTier } from "@/lib/credits";
import type {
  ChatMessage,
  ThreadSummary,
  ThreadDetail,
  EconTotals,
} from "@/components/chat/types";

// Most recent conversations first; a personal history is small, but bound it so
// a pathological account can't drag the chat page load.
const MAX_THREADS = 50;
const TITLE_MAX = 70;

export function toTier(tier: string): "standard" | "premium" {
  return tier === "premium" ? "premium" : "standard";
}

// Title = the opening user message, collapsed and truncated. Falls back to the
// first message of any role, then a generic label, so a thread always has one.
export function toTitle(text: string | undefined): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1).trimEnd()}…` : clean;
}

// Shape of a thread row as fetched below — kept explicit so the pure
// summarizer can be unit-tested without a database.
export type ThreadRow = {
  id: string;
  tier: string;
  closedAt: Date | null;
  messages: { role: string; content: string; createdAt: Date }[];
};

// Pure transform: threads (with their non-redacted messages, oldest-first) →
// history rows, most-recently-active first. Threads with no visible messages
// are skipped — a tier switch can create an empty Thread that never received a
// turn, and an erased thread's messages are all redacted away.
export function summarizeThreads(threads: ThreadRow[]): ThreadSummary[] {
  const summaries: ThreadSummary[] = [];
  for (const t of threads) {
    if (t.messages.length === 0) continue;
    const firstUser = t.messages.find((m) => m.role === "user");
    const last = t.messages[t.messages.length - 1];
    summaries.push({
      id: t.id,
      title: toTitle(firstUser?.content ?? t.messages[0].content),
      tier: toTier(t.tier),
      closed: t.closedAt !== null,
      updatedAt: last.createdAt.toISOString(),
      messageCount: t.messages.length,
    });
  }

  // Order by real last-activity, which the createdAt thread sort approximates
  // but doesn't guarantee (a long-dormant thread revived today should float up).
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return summaries;
}

// Lists a user's past conversations, most-recently-active first.
export async function listThreadSummaries(userId: string): Promise<ThreadSummary[]> {
  const threads = await prisma.thread.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_THREADS,
    select: {
      id: true,
      tier: true,
      closedAt: true,
      messages: {
        where: { redacted: false },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      },
    },
  });

  return summarizeThreads(threads);
}

// Loads one past conversation for viewing/resuming. Returns null if the thread
// doesn't exist or isn't owned by this user (the ownership scope is the
// authorization check). Redacted messages are dropped.
export async function getThreadForUser(
  userId: string,
  threadId: string,
): Promise<ThreadDetail | null> {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, userId },
    select: {
      id: true,
      tier: true,
      closedAt: true,
      messages: {
        where: { redacted: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
        },
      },
    },
  });
  if (!thread) return null;

  const messages: ChatMessage[] = thread.messages.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  return {
    id: thread.id,
    tier: toTier(thread.tier),
    closed: thread.closedAt !== null,
    messages,
    economics: threadEconomics(thread.tier, thread.messages),
  };
}

// Rebuilds a thread's accumulated economics from its persisted per-turn data,
// mirroring the live turnEconomics() math (lib/pricing) so a reopened thread
// reads exactly as it did when run live. Every persisted assistant message is
// one successful, charged turn (failed turns are refunded before any message
// is written), so credits = tier cost × assistant turns.
export function threadEconomics(
  tier: string,
  msgs: { role: string; model: string | null; inputTokens: number; outputTokens: number }[],
): EconTotals {
  let turns = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  for (const m of msgs) {
    if (m.role !== "assistant") continue;
    turns += 1;
    inputTokens += m.inputTokens;
    outputTokens += m.outputTokens;
    costUsd += modelCostUsd(m.model ?? "", m.inputTokens, m.outputTokens);
  }
  const revenueUsd = turns * costForTier(tier) * creditUnitPriceUsd();
  return { turns, inputTokens, outputTokens, costUsd, revenueUsd, profitUsd: revenueUsd - costUsd };
}

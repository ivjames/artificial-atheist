"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { sendChatMessage, type ChatResult, type ChatTier } from "@/lib/agent/chat";
import { rateLimits } from "@/lib/config";
import { rateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { CHAT_ENABLED, credits } from "@/lib/config";
import { isPreviewMode, isPreviewGrant, PREVIEW_COOKIE } from "@/lib/preview";
import { getBalance, grantTestCreditsIfLow } from "@/lib/credits";
import { getThreadForUser } from "@/lib/chat/history";
import type { ThreadDetail } from "@/components/chat/types";

// Re-checks auth on every call (server actions are reachable independent of
// the page's own gate) and delegates to the orchestrator.
export async function postMessage(
  threadId: string | null,
  content: string,
  tier: ChatTier,
): Promise<ChatResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "You've been signed out. Please sign in again.",
    };
  }

  // Per-user burst throttle — a paid user still shouldn't be able to hammer the
  // model faster than a human debate (§8). Credits are the real meter; this
  // just caps runaway automation.
  if (!rateLimit(`chat:${user.id}`, rateLimits.chatPerUserPerMin, 60 * 1000).ok) {
    return {
      status: "error",
      message: "You're sending messages too quickly — give it a moment and try again.",
    };
  }

  return sendChatMessage(user.id, {
    threadId: threadId ?? undefined,
    content,
    tier,
  });
}

// Opens one of the user's past conversations for viewing/resuming. Returns null
// if it's gone or not theirs (ownership is scoped in getThreadForUser, so a
// forged id can't read another user's history). Re-checks auth like every
// other action here.
export async function loadThread(threadId: string): Promise<ThreadDetail | null> {
  if (!CHAT_ENABLED) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  return getThreadForUser(user.id, threadId);
}

// No-op marker for "start a new thread" — the client just drops its local
// threadId, and the next postMessage() call opens a fresh Thread server-side.
// Kept as a server action for symmetry / a future hook point (e.g. explicit
// close-out bookkeeping) rather than pure client state.
export async function startNewThread(): Promise<void> {}

// Ends a chat: marks the thread closed so it's done for good. Ownership-scoped
// and idempotent (updateMany over id + userId + still-open). The client resets
// to an empty chat afterward.
export async function closeThread(threadId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.thread.updateMany({
    where: { id: threadId, userId: user.id, closedAt: null },
    data: { closedAt: new Date() },
  });
}

// Preview-only in-chat credit reload for testing. Same hard gate as the other
// preview tools (lock on + preview cookie). Adds 100 credits and returns the
// new balance so the client can update without a page reload. -1 = not allowed.
export async function reloadTestCredits(): Promise<number> {
  if (!CHAT_ENABLED || !isPreviewMode()) return -1;
  const jar = await cookies();
  if (!isPreviewGrant(jar.get(PREVIEW_COOKIE)?.value)) return -1;

  const user = await getCurrentUser();
  if (!user) return -1;

  // Only when the balance is actually low, and rate-limited so it can't be spammed.
  // The pre-check just avoids burning a rate-limit token when clearly not low; the
  // authoritative low-balance check + grant is atomic in grantTestCreditsIfLow.
  const balance = await getBalance(user.id);
  if (balance > credits.lowBalanceThreshold) return balance;
  if (!rateLimit(`topup:${user.id}`, rateLimits.topUpPerHour, 60 * 60 * 1000).ok) {
    return balance;
  }

  return grantTestCreditsIfLow(user.id, 100, credits.lowBalanceThreshold, "Preview test reload");
}

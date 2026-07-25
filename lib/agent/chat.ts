// Core debate-chat orchestration (§2 agent, §4 credit metering + thread cap).
// Callable from a server action (app/chat/actions.ts). Contains no framework
// (cookies/redirect) concerns — those live in app/chat/page.tsx and actions.ts.

import { prisma } from "@/lib/prisma";
import { callSlot } from "@/lib/models/router";
import { ModelProviderError } from "@/lib/models/types";
import type { ChatRole } from "@/lib/models/types";
import {
  DEBATE_SYSTEM_PROMPT,
  looksLikeMinor,
  minorRedirectMessage,
  articleReferenceBlock,
} from "@/lib/agent/persona";
import { searchArticles } from "@/lib/articles";
import { threadTokenBudget, maxOutputTokens, SITE_URL } from "@/lib/config";
import { turnEconomics, type TurnEconomics } from "@/lib/pricing";
import {
  costForTier,
  spendCredits,
  InsufficientCreditsError,
} from "@/lib/credits";

export type ChatTier = "standard" | "premium";

export type ChatResult =
  | {
      status: "ok";
      threadId: string;
      assistant: string;
      balance: number;
      closed: boolean;
      inputTokens: number;
      outputTokens: number;
      economics: TurnEconomics;
    }
  | { status: "minor"; assistant: string }
  | { status: "capped"; threadId: string }
  | { status: "need_credits"; required: number; balance: number }
  | { status: "error"; message: string };

export type SendChatMessageInput = {
  threadId?: string;
  content: string;
  tier: ChatTier;
};

// Relative path — the quiz is mounted in this same app.
const MINOR_QUIZ_URL = "/quiz";

export async function sendChatMessage(
  userId: string,
  input: SendChatMessageInput,
): Promise<ChatResult> {
  const content = input.content.trim();
  if (!content) {
    return { status: "error", message: "Message can't be empty." };
  }

  // (a) MINOR BACKSTOP — deterministic pre-filter, before any spend or model
  // call. This fires even on a brand-new thread that hasn't hit the DB yet.
  if (looksLikeMinor(content)) {
    return { status: "minor", assistant: minorRedirectMessage(MINOR_QUIZ_URL) };
  }

  // (b) Resolve thread. Reuse an open thread owned by this user; otherwise
  // open a new one. Tier is fixed at creation — a tier change is a new thread,
  // never a silent upgrade of an existing one (§3 routing rule).
  const existing = input.threadId
    ? await prisma.thread.findUnique({ where: { id: input.threadId } })
    : null;
  const thread =
    existing && existing.userId === userId && !existing.closedAt
      ? existing
      : await prisma.thread.create({
          data: { userId, tier: input.tier, tokenBudget: threadTokenBudget },
        });

  // (c) THREAD CAP — don't call the model once the budget is already spent.
  // (Normally the thread gets closedAt set the moment it crosses the budget,
  // so a caller hits this only on an edge/race case where an open thread is
  // already at or past its cap.)
  if (thread.inputTokens + thread.outputTokens >= thread.tokenBudget) {
    return { status: "capped", threadId: thread.id };
  }

  // (d) CREDITS — charge before calling the model; refunded below if the
  // model call fails.
  const cost = costForTier(thread.tier);
  let balance: number;
  try {
    balance = await spendCredits(userId, cost, thread.id, "chat turn");
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        status: "need_credits",
        required: err.required,
        balance: err.available,
      };
    }
    throw err;
  }

  // (e) Build the transcript and call the model.
  const priorMessages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });
  const messages = [
    ...priorMessages.map((m) => ({ role: m.role as ChatRole, content: m.content })),
    { role: "user" as ChatRole, content },
  ];
  const slot = thread.tier === "premium" ? ("premium" as const) : ("standard" as const);

  // Article reference library for this turn — best-effort: surface a few
  // published articles relevant to the visitor's message so the agent can cite
  // them. Non-fatal if the lookup fails; passed as un-cached context so it
  // doesn't invalidate the cached persona.
  let context: string | undefined;
  try {
    const refs = await searchArticles(content, 3);
    const block = articleReferenceBlock(refs, SITE_URL);
    if (block) context = block;
  } catch {
    /* article refs are a nicety, never block the debate on them */
  }
  // Estimate the reference-library token cost (~4 chars/token) so it can be
  // tracked separately from the conversation — it's platform overhead the
  // visitor never typed, so it must not inflate their token counter or budget.
  const estRefTokens = context ? Math.ceil(context.length / 4) : 0;

  let completion;
  try {
    completion = await callSlot(slot, {
      system: DEBATE_SYSTEM_PROMPT,
      context,
      messages,
      maxTokens: maxOutputTokens,
    });
  } catch (err) {
    // Model call failed after the spend was recorded — refund it so the
    // failure isn't billed.
    await prisma.creditEntry.create({
      data: {
        userId,
        amount: cost,
        kind: "refund",
        reason:
          err instanceof ModelProviderError
            ? `model error (${err.provider}): ${err.message}`
            : "model call failed",
        threadId: thread.id,
      },
    });
    return {
      status: "error",
      message: "The debate agent is unavailable right now. Your credit was refunded — try again.",
    };
  }

  // (f) Persist both turns and update thread usage / closure atomically.
  // Split the billed input into conversation vs. reference-library tokens: the
  // thread budget (and the visitor's counter) count only the conversation; the
  // reference overhead is tracked separately and folded into cost/profit.
  const refInputTokens = Math.min(estRefTokens, completion.inputTokens);
  const convInputTokens = completion.inputTokens - refInputTokens;
  const newInputTokens = thread.inputTokens + convInputTokens;
  const newOutputTokens = thread.outputTokens + completion.outputTokens;
  const closed = newInputTokens + newOutputTokens >= thread.tokenBudget;

  await prisma.$transaction([
    prisma.message.create({
      data: { threadId: thread.id, role: "user", content },
    }),
    prisma.message.create({
      data: {
        threadId: thread.id,
        role: "assistant",
        content: completion.text,
        model: completion.model,
        inputTokens: convInputTokens,
        refInputTokens,
        outputTokens: completion.outputTokens,
      },
    }),
    prisma.thread.update({
      where: { id: thread.id },
      data: {
        inputTokens: newInputTokens,
        outputTokens: newOutputTokens,
        ...(closed ? { closedAt: new Date() } : {}),
      },
    }),
  ]);

  return {
    status: "ok",
    threadId: thread.id,
    assistant: completion.text,
    balance,
    closed,
    inputTokens: convInputTokens,
    outputTokens: completion.outputTokens,
    economics: turnEconomics(
      completion.model,
      convInputTokens,
      completion.outputTokens,
      refInputTokens,
      cost,
    ),
  };
}

import { notFound, redirect } from "next/navigation";
import { CHAT_ENABLED, credits } from "@/lib/config";
import { isPreviewMode } from "@/lib/preview";
import { isAgeConfirmed } from "@/lib/age";
import { getCurrentUser } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { listThreadSummaries } from "@/lib/chat/history";
import ChatClient from "./ChatClient";
import type { ChatTier } from "@/lib/agent/chat";

// Reads the age cookie, session, and balance per request.
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  if (!CHAT_ENABLED) notFound();
  if (!(await isAgeConfirmed())) redirect("/age");

  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  // Always start on a fresh chat — do NOT auto-resume the previous
  // conversation. Past debates are still available on demand via the history
  // panel (the user opens one deliberately), just not silently reopened here.
  const [balance, history] = await Promise.all([
    getBalance(user.id),
    listThreadSummaries(user.id),
  ]);

  return (
    <ChatClient
      initialThreadId={null}
      initialTier={"standard" as ChatTier}
      initialMessages={[]}
      initialBalance={balance}
      initialHistory={history}
      costs={{ standard: credits.standardCost, premium: credits.premiumCost }}
      previewMode={isPreviewMode()}
      lowBalanceThreshold={credits.lowBalanceThreshold}
    />
  );
}

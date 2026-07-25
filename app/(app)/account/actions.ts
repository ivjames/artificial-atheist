"use server";

import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { CHAT_ENABLED, credits, rateLimits } from "@/lib/config";
import { getCurrentUser, destroySession } from "@/lib/auth/session";
import { grantConsent, revokeConsent } from "@/lib/consent";
import { getBalance, grantTestCreditsIfLow } from "@/lib/credits";
import { rateLimit } from "@/lib/ratelimit";
import { isPreviewMode, isPreviewGrant, PREVIEW_COOKIE } from "@/lib/preview";
import { eraseUser } from "@/lib/erasure";

// Preview-only credit top-up for testing. Same hard gate as the dev sign-in:
// only while the preview lock is on AND the caller holds the preview cookie.
// Disappears at public launch (notFound). Grants a fixed test amount.
export async function devTopUp(): Promise<void> {
  if (!CHAT_ENABLED || !isPreviewMode()) notFound();
  const jar = await cookies();
  if (!isPreviewGrant(jar.get(PREVIEW_COOKIE)?.value)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  // Only when the balance is actually low, and rate-limited so it can't be spammed.
  // The pre-check just avoids burning a rate-limit token when clearly not low; the
  // authoritative low-balance check + grant is atomic in grantTestCreditsIfLow.
  const balance = await getBalance(user.id);
  if (balance > credits.lowBalanceThreshold) {
    revalidatePath("/account");
    return;
  }
  if (!rateLimit(`topup:${user.id}`, rateLimits.topUpPerHour, 60 * 60 * 1000).ok) {
    revalidatePath("/account");
    return;
  }

  await grantTestCreditsIfLow(user.id, 100, credits.lowBalanceThreshold, "Preview test top-up");
  revalidatePath("/account");
}

// Toggles the optional article-use consent. Never touches access/credits.
export async function setArticleConsent(on: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  if (on) {
    await grantConsent(user.id, "article_use");
  } else {
    await revokeConsent(user.id, "article_use");
  }
  revalidatePath("/account");
}

// Right-to-erasure (§6), triggered from the account page's confirm step.
export async function deleteMyAccount(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  await eraseUser(user.id);
  await destroySession();
  redirect("/");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  await destroySession();
  redirect("/");
}

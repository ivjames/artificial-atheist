"use server";

import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { requestMagicLink } from "@/lib/auth/tokens";
import { CHAT_ENABLED, rateLimits } from "@/lib/config";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { currentRegionDecision } from "@/lib/geo-server";
import { isPreviewMode, isPreviewGrant, PREVIEW_COOKIE } from "@/lib/preview";
import { prisma } from "@/lib/prisma";
import { grantConsent } from "@/lib/consent";
import { createSession } from "@/lib/auth/session";
import { grantFreeQuotaOnce } from "@/lib/credits";

// Server action behind the contact-gate form. Fully progressive-enhancement
// friendly: no client JS is required, all state lives in the redirect's
// query string (?sent=1 / ?error=...) so app/signup/page.tsx can render the
// right view on the next request.
export async function submitSignup(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  // The required checkbox — HTML `required` already blocks submission, but
  // the server re-checks since form validation can be bypassed.
  const agreeTerms = formData.get("agreeTerms") === "on";
  // The separate, optional checkbox — access never depends on this (§6).
  const articleUseConsent = formData.get("articleUseConsent") === "on";

  if (!agreeTerms) {
    redirect("/signup?error=terms");
  }

  // Defense-in-depth behind the middleware region gate: this is the moment an
  // email is actually persisted, so re-check here that the visitor isn't in a
  // blocked (GDPR) region before we collect anything (LAUNCH-BLOCKERS.md §1).
  if (!(await currentRegionDecision()).allowed) {
    redirect("/unavailable");
  }

  // Per-IP throttle: one address minting many accounts is the main free-tier
  // abuse vector (§8). Checked before we touch the DB or send anything.
  const ip = await clientIp();
  if (!rateLimit(`auth:ip:${ip}`, rateLimits.authPerIpPerHour, 60 * 60 * 1000).ok) {
    redirect("/signup?error=rate");
  }

  const result = await requestMagicLink(email, articleUseConsent);
  if (!result.ok) {
    redirect(`/signup?error=${result.error ?? "invalid"}`);
  }

  redirect("/signup?sent=1");
}

const DEV_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Preview-only instant sign-in — skips the magic-link email entirely so a
// tester can get straight into the chat while real email isn't wired. Hard
// gated so it can NEVER be a production hole: it exists only while the preview
// lock is on (CHAT_PREVIEW_TOKEN set) AND the caller already holds a valid
// preview cookie. Unset the token for public launch and this action 404s.
// Creates the exact same session + free quota a real magic-link verify would.
export async function devLogin(formData: FormData): Promise<void> {
  if (!CHAT_ENABLED || !isPreviewMode()) notFound();
  const jar = await cookies();
  if (!isPreviewGrant(jar.get(PREVIEW_COOKIE)?.value)) notFound();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!DEV_EMAIL_RE.test(email)) redirect("/signup?error=invalid");

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email } });
  // Dev sign-in implies the same Terms acceptance the real gate records.
  await grantConsent(user.id, "terms");
  await createSession(user.id);
  await grantFreeQuotaOnce(user.id);
  redirect("/chat");
}

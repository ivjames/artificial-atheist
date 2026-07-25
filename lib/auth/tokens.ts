import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SITE_URL, rateLimits } from "@/lib/config";
import { sendEmail } from "@/lib/email";
import { grantConsent } from "@/lib/consent";
import { rateLimit } from "@/lib/ratelimit";

// Magic-link auth (§4 access flow). No passwords: a one-time, short-lived
// token proves control of the email address and doubles as the contact-gate
// submission (agreeing to Terms + optionally opting in to article use).

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Sends a sign-in link to `email`. Always returns {ok:true} on a well-formed
// address regardless of whether the user already existed — existence is
// never revealed to the caller. `articleUseConsent` is strictly additive and
// never blocks issuing the link.
export async function requestMagicLink(
  email: string,
  articleUseConsent: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: "invalid" };
  }

  // Per-email throttle: caps how fast one address can trigger sign-in emails,
  // limiting free-question farming and mailbombing (§8).
  if (
    !rateLimit(
      `auth:email:${normalized}`,
      rateLimits.authPerEmailPerHour,
      60 * 60 * 1000,
    ).ok
  ) {
    return { ok: false, error: "rate" };
  }

  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({ data: { email: normalized } });
  }

  // Submitting this form is agreeing to the Terms — record it (idempotent).
  await grantConsent(user.id, "terms");
  if (articleUseConsent) {
    await grantConsent(user.id, "article_use");
  }

  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${SITE_URL}/api/auth/verify?token=${raw}`;
  await sendEmail({
    to: normalized,
    subject: "Your sign-in link — unlock your free questions",
    text:
      `Click this link to verify your email and unlock your free debate questions:\n\n${link}\n\n` +
      `This link expires in 30 minutes and can only be used once. ` +
      `If you didn't request this, you can safely ignore it.`,
    html:
      `<p>Click below to verify your email and unlock your free debate questions:</p>` +
      `<p><a href="${link}">${link}</a></p>` +
      `<p>This link expires in 30 minutes and can only be used once. ` +
      `If you didn't request this, you can safely ignore it.</p>`,
  });

  return { ok: true };
}

// Redeems a raw token: hashes it, looks up the LoginToken, and (if valid)
// marks it used and verifies the owning user. Returns the userId on success,
// null on any invalid/expired/already-used token (never throws on bad input).
export async function consumeMagicLink(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.loginToken.findUnique({ where: { tokenHash } });
  if (!token || token.usedAt || token.expiresAt < new Date()) return null;

  await prisma.loginToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: token.userId } });
  if (!user || user.deletedAt) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      ageConfirmedAt: user.ageConfirmedAt ?? new Date(),
    },
  });

  return user.id;
}

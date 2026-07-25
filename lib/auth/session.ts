import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

// Lightweight stateless session: an HMAC-signed cookie carrying the user id.
// No password store, no JWT dependency — identity is proven by the magic-link
// email flow (lib/auth), and the cookie just remembers who verified.

const COOKIE = "aa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set (>=16 chars) to sign sessions",
    );
  }
  return s;
}

function sign(value: string): string {
  const mac = crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("base64url");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const expected = sign(value);
  // Constant-time compare over the full signed string.
  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

// Payload is `${userId}:${issuedAtSeconds}` so an old cookie can be aged out.
export async function createSession(userId: string): Promise<void> {
  const payload = `${userId}:${Math.floor(Date.now() / 1000)}`;
  const jar = await cookies();
  jar.set(COOKIE, sign(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const payload = verify(raw);
  if (!payload) return null;
  const [userId, issuedAt] = payload.split(":");
  const age = Math.floor(Date.now() / 1000) - Number.parseInt(issuedAt, 10);
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return null;
  return userId || null;
}

// Resolves the signed-in, non-deleted, email-verified user (or null).
export async function getCurrentUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt || !user.emailVerifiedAt) return null;
  return user;
}

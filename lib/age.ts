import { cookies } from "next/headers";

// Self-declared 18+ gate (§4). This is NOT identity verification — a visitor
// can simply click through — so treat this cookie as a soft, honesty-based
// checkpoint, not an access-control guarantee. The MINOR BACKSTOP in
// lib/agent/persona.ts / lib/agent/chat.ts is the real safety net once inside
// the chat itself.

const COOKIE = "aa_age";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // ~365 days

export async function setAgeConfirmed(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function isAgeConfirmed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === "1";
}

export async function clearAge(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

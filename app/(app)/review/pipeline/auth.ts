// Shared admin-token gate for app/review/**. Deliberately simple: one shared
// secret in ADMIN_TOKEN, checked against an httpOnly cookie. There is no
// per-admin identity — this is a single-operator review queue, not a
// multi-user auth system.
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aa_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// The configured admin secret, or null if the admin surface isn't set up.
// Every admin route/action must treat "unset" as "this feature doesn't
// exist" (notFound()), never as "open".
export function adminToken(): string | null {
  const t = process.env.ADMIN_TOKEN;
  return t && t.trim() ? t : null;
}

export async function isAdminAuthed(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === token;
}

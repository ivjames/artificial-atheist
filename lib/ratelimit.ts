import { headers } from "next/headers";

// In-memory sliding-window rate limiter — best-effort abuse control (spec §8:
// free questions per email + free-to-mint email = trivial farming).
//
// SCOPE: adequate for the single-instance pm2 deployment (one Next process on
// :8060). State is per-process, so it resets on restart and does NOT coordinate
// across instances — if the app is ever scaled horizontally, back this with a
// shared store (e.g. Redis). It is a throttle, not a security boundary.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

// Opportunistic cleanup so the map can't grow without bound under key churn.
function sweep(now: number): void {
  if (now - lastSweep < 60_000 && buckets.size < 10_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export type RateResult = { ok: boolean; retryAfterMs: number };

// Allows up to `limit` events per `windowMs` for a given key. The window is
// fixed (resets `windowMs` after the first event in a run).
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

// Best-effort client IP from proxy headers (nginx sets X-Forwarded-For /
// X-Real-IP). Falls back to a constant so a missing header degrades to a
// single shared bucket rather than throwing.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}

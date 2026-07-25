import "server-only";
import { headers, cookies } from "next/headers";
import { decideFromHeaders, type GeoDecision } from "@/lib/geo";
import { isPreviewGrant, PREVIEW_COOKIE } from "@/lib/preview";

// Server-side region decision for use inside server actions / route handlers.
// This is defense-in-depth behind middleware.ts: the middleware is the primary
// gate, but the true PII-ingress points (signup submit, magic-link verify) also
// re-check here so a matcher mistake can never cause GDPR-region data to be
// persisted. Kept out of lib/geo.ts because `next/headers` is server-only and
// must not be pulled into the Edge middleware bundle.
export async function currentRegionDecision(): Promise<GeoDecision> {
  // An authorized preview tester bypasses the region gate (mirrors middleware).
  const c = await cookies();
  if (isPreviewGrant(c.get(PREVIEW_COOKIE)?.value)) {
    return { allowed: true, country: null, reason: "permitted" };
  }
  const h = await headers();
  return decideFromHeaders((name) => h.get(name));
}

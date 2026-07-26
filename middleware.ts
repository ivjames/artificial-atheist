import { NextRequest, NextResponse } from "next/server";
import { CHAT_ENABLED } from "@/lib/config";
import { decideFromHeaders } from "@/lib/geo";
import {
  isPreviewMode,
  isPreviewGrant,
  previewToken,
  PREVIEW_COOKIE,
  PREVIEW_PARAM,
} from "@/lib/preview";

// Region gate (GDPR sidestep — see lib/geo.ts and LAUNCH-BLOCKERS.md §1/§2).
// Runs only on the chat/data-collection surface (see `matcher` below); the
// existing quiz product (/quiz, /leaderboard, /result, /api/questions) is never
// gated, and neither are /terms, /privacy, or the /review admin queue.
//
// NOTE: /api/payments is intentionally NOT gated. The Stripe webhook
// (/api/payments/webhook) is provider-to-server traffic with no end-user
// country header — gating it would fail it closed (451) and credits would
// never be fulfilled. Payment *initiation* is already gated upstream at
// /pricing, and each payment route keeps its own CHAT_ENABLED + signature check.
// Build a redirect target on the PUBLIC host. Behind nginx, request.nextUrl's
// origin can resolve to the app's internal address (localhost:8060), which
// would bounce the browser to a dead host. nginx forwards the real host/proto
// (X-Forwarded-Host / -Proto, Host), so derive the origin from those.
function publicUrl(req: NextRequest, pathname: string, search = ""): URL {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(/:$/, "") ||
    "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host;
  const url = new URL(`${proto}://${host}`);
  url.pathname = pathname;
  url.search = search;
  return url;
}

export function middleware(req: NextRequest) {
  // While the chat is dark, everything 404s on its own — don't turn a 404 into
  // a region redirect. The gate only matters once the surface is live.
  if (!CHAT_ENABLED) return NextResponse.next();

  // Pre-launch preview lock. When a preview token is set, the chat surface is
  // private and this takes precedence over the region gate.
  if (isPreviewMode()) {
    const token = previewToken();
    const param = req.nextUrl.searchParams.get(PREVIEW_PARAM);

    // The secret link: `?preview=<token>` mints the cookie, then redirect to
    // the clean URL so the token doesn't linger in history/referrer.
    if (isPreviewGrant(param)) {
      // Redirect to the clean path on the public host (search dropped → strips
      // the ?preview token from the URL).
      const res = NextResponse.redirect(publicUrl(req, req.nextUrl.pathname));
      res.cookies.set(PREVIEW_COOKIE, token as string, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      res.headers.set("x-robots-tag", "noindex");
      return res;
    }

    // Already-unlocked device: allow, bypassing the region gate (an authorized
    // tester may be anywhere).
    if (isPreviewGrant(req.cookies.get(PREVIEW_COOKIE)?.value)) {
      return NextResponse.next();
    }

    // Everyone else: the surface is invisible.
    return new NextResponse(null, {
      status: 404,
      headers: { "x-robots-tag": "noindex" },
    });
  }

  const decision = decideFromHeaders((name) => req.headers.get(name));
  if (decision.allowed) return NextResponse.next();

  // Blocked. A browser page load must NEVER be answered with a JSON body — the
  // browser would download it as a file instead of showing a page. So every GET
  // that could be a page view is redirected to the plain HTML explainer. That
  // deliberately includes GETs that don't advertise `text/html`: Next.js RSC
  // navigations and `<Link>` prefetches send `Accept: */*` (or an `RSC` header),
  // and answering those with JSON is exactly what produced the "downloads the
  // chat" bug. The raw 451 is reserved for genuine data traffic that no browser
  // renders — API routes and non-GET requests (e.g. server-action POSTs) — so no
  // data-collecting request slips through.
  const isDataRequest =
    req.method !== "GET" || req.nextUrl.pathname.startsWith("/api/");

  if (!isDataRequest) {
    const res = NextResponse.redirect(publicUrl(req, "/unavailable"));
    res.headers.set("x-robots-tag", "noindex");
    return res;
  }

  return NextResponse.json(
    { error: "unavailable_in_region" },
    { status: 451, headers: { "x-robots-tag": "noindex" } },
  );
}

// Precise matcher: only the chat surface + its data-collection APIs. Bare and
// wildcard forms are both listed so `/signup` and `/signup/...` are covered.
export const config = {
  matcher: [
    "/age",
    "/age/:path*",
    "/signup",
    "/signup/:path*",
    "/chat",
    "/chat/:path*",
    "/account",
    "/account/:path*",
    "/pricing",
    "/pricing/:path*",
    "/api/auth/:path*",
  ],
};

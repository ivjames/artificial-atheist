import { NextRequest, NextResponse } from "next/server";
import { CHAT_ENABLED } from "@/lib/config";
import { decideFromHeaders } from "@/lib/geo";
import { nonceCsp } from "@/lib/csp.mjs"; // plain .mjs, shared with next.config.mjs
import { themeScript, gtagStub } from "@/lib/inline-scripts";
import { site } from "@/lib/site";
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

// sha256 hashes (CSP source form) of the two fixed inline bootstraps the root
// layout renders, computed once from the same strings the layout imports so
// they can never drift. These let the strict nonce policy on dynamic app
// pages run the theme/gtag stubs without 'unsafe-inline'.
let bootstrapHashes: Promise<string[]> | null = null;
function inlineBootstrapHashes(): Promise<string[]> {
  bootstrapHashes ??= Promise.all(
    [themeScript, gtagStub(site.analytics.gaId)].map(async (src) => {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(src),
      );
      return `sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}`;
    }),
  );
  return bootstrapHashes;
}

// The chat/data-collection surface: the ONLY paths the region gate applies to
// (unchanged set — the quiz product, /terms, /privacy, and /review are never
// gated). The matcher below now also covers the rest of the dynamic app
// surface for CSP purposes, so the gate must check paths itself.
const GATED_PREFIXES = ["/age", "/signup", "/chat", "/account", "/pricing", "/api/auth"];
function isGatedPath(pathname: string): boolean {
  return GATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Region/preview gate, extracted verbatim from the old middleware body.
// Returns a terminal response (redirect / 404 / 451) or null to fall through.
function chatGate(req: NextRequest): NextResponse | null {
  // While the chat is dark, everything 404s on its own — don't turn a 404 into
  // a region redirect. The gate only matters once the surface is live.
  if (!CHAT_ENABLED) return null;

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
      return null;
    }

    // Everyone else: the surface is invisible.
    return new NextResponse(null, {
      status: 404,
      headers: { "x-robots-tag": "noindex" },
    });
  }

  const decision = decideFromHeaders((name) => req.headers.get(name));
  if (decision.allowed) return null;

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Region/preview gate first — only on the chat surface, exactly as before.
  // A terminal gate response (redirect/404/451) renders no app page, so it
  // doesn't need the nonce policy.
  if (isGatedPath(pathname)) {
    const gated = chatGate(req);
    if (gated) return gated;
  }

  // API responses aren't documents; CSP is meaningless there.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Strict nonce CSP for the dynamic app surface (every matched page path is
  // server-rendered per request — see lib/csp.mjs). Setting the policy on the
  // REQUEST headers is what makes Next stamp the nonce onto every script tag
  // it emits; setting it on the response is what the browser enforces. The
  // static publication is NOT matched here and keeps its policy from
  // next.config.mjs. (Known cosmetic gap: a 404 under these paths serves the
  // prerendered not-found page, whose un-nonce'd hydration scripts get
  // blocked — the page still displays.)
  const nonce = btoa(crypto.randomUUID());
  const csp = nonceCsp(nonce, await inlineBootstrapHashes());
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

// The dynamic app surface (every top-level segment of app/(app)/ — MUST stay
// in sync with APP_PATHS in lib/csp.mjs; Next requires this to be a static
// literal, so it can't be derived) plus the gate's auth API. Bare and
// wildcard forms are both listed so `/signup` and `/signup/...` are covered.
// Do NOT add static publication paths here — the nonce policy would break
// their prerendered, nonce-less HTML.
export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/age",
    "/age/:path*",
    "/chat",
    "/chat/:path*",
    "/leaderboard",
    "/leaderboard/:path*",
    "/pricing",
    "/pricing/:path*",
    "/privacy",
    "/privacy/:path*",
    "/prophecy",
    "/prophecy/:path*",
    "/quiz",
    "/quiz/:path*",
    "/result",
    "/result/:path*",
    "/review",
    "/review/:path*",
    "/signup",
    "/signup/:path*",
    "/terms",
    "/terms/:path*",
    "/unavailable",
    "/unavailable/:path*",
    "/api/auth/:path*",
  ],
};

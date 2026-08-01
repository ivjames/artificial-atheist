// CSP is split (see lib/csp.mjs): statically generated publication pages get
// STATIC_CSP here — their Next hydration payloads are inline <script>s, so
// script-src needs 'unsafe-inline' (per-request nonces don't work with SSG) —
// while the dynamic app surface (APP_PATHS, excluded from this header's
// source) gets a strict per-request nonce policy from middleware.ts instead.
// Fonts and icons are self-hosted; the only external hosts are
// googletagmanager/google-analytics for GA4 (lib/site.ts).
import { STATIC_CSP, STATIC_CSP_SOURCE } from "./lib/csp.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Security headers the app owns (nginx adds HSTS/XFO/XCTO/Referrer-Policy —
  // don't duplicate those here or responses carry the header twice).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        // Everything EXCEPT the app paths — those get their CSP from
        // middleware, and two CSP headers enforce as the intersection.
        source: STATIC_CSP_SOURCE,
        headers: [{ key: "Content-Security-Policy", value: STATIC_CSP }],
      },
    ];
  },
  // Preserve the publication's canonical URLs, which have always ended in a
  // trailing slash (/posts/<slug>/, /topics/<topic>/, /about/, …). Without
  // this Next would serve them slash-less and 308 the trailing-slash form
  // away, changing every indexed article URL. The app uses server actions
  // (no in-app /api fetches), so this doesn't affect internal API calls.
  // NOTE: external POSTers to API routes (e.g. the Stripe webhook, still dark)
  // must use the trailing-slash form — configure that URL accordingly at launch.
  trailingSlash: true,
};

export default nextConfig;

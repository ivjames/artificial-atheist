// Content-Security-Policy definitions, shared by next.config.mjs (static
// publication pages) and middleware.ts (dynamic app pages). Plain .mjs so the
// config can import it without a TS loader.
//
// Two policies, one split:
// - STATIC pages (the publication: /, /posts/*, /topics/*, /about, /faq,
//   /search, /debate, feeds) are prerendered at build time, so per-request
//   nonces are impossible and their Next hydration payloads are inline
//   <script>s → script-src needs 'unsafe-inline'. Served via next.config
//   headers(), which EXCLUDES the app paths below.
// - DYNAMIC app pages (quiz/account/review/prophecy/… — everything in
//   app/(app)/, all server-rendered per request) get a strict nonce-based
//   policy from middleware.ts instead: Next stamps the nonce onto every
//   script it emits when the request carries a CSP header with a nonce, and
//   the two fixed inline bootstraps from the root layout (theme + gtag stub,
//   lib/inline-scripts.ts) are allowed by sha256 hash. These are the surfaces
//   with user input and privileged cookies, where XSS mitigation matters most.

// Top-level path segments of the dynamic app surface. Keep in sync with
// app/(app)/ AND the middleware matcher (which must be a static literal).
// A static route accidentally listed here would break: middleware would stamp
// a nonce policy onto prerendered HTML whose scripts carry no nonce.
export const APP_PATHS = [
  "account",
  "age",
  "chat",
  "leaderboard",
  "pricing",
  "privacy",
  "prophecy",
  "quiz",
  "result",
  "review",
  "signup",
  "terms",
  "unavailable",
];

// next.config `source` matcher for every path that is NOT an app path.
export const STATIC_CSP_SOURCE = `/((?!${APP_PATHS.join("|")}).*)`;

function cspWith(scriptSrc) {
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

// Publication policy (unchanged from the pre-split site-wide policy).
export const STATIC_CSP = cspWith(
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
);

/**
 * Strict per-request policy for dynamic app pages.
 * @param {string} nonce - per-request nonce (base64)
 * @param {string[]} hashes - "sha256-…" hashes of the fixed inline bootstraps
 * 'strict-dynamic' lets the nonce'd Next runtime load its own chunks and the
 * afterInteractive gtag loader; the host allowlist stays as a fallback for
 * pre-CSP3 browsers (CSP3 ones ignore it when strict-dynamic is present).
 */
export function nonceCsp(nonce, hashes) {
  const extra = hashes.map((h) => `'${h}'`).join(" ");
  return cspWith(
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${extra} https://www.googletagmanager.com`,
  );
}

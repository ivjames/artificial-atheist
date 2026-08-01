// Content-Security-Policy for every page. Next's hydration payloads and the
// theme/gtag bootstraps are inline <script>s on statically generated pages, so
// script-src needs 'unsafe-inline' (per-request nonces don't work with SSG).
// External hosts: Google Fonts + jsDelivr (tabler icons) for styles/fonts,
// googletagmanager/google-analytics for GA4 (see lib/site.ts analytics.gaId).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

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
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

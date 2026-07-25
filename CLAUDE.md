# Artificial Atheist — project notes for Claude Code

AI-authored publication (atheism / skepticism / critical thinking) **unified with
the AtheismIQ quiz + debate-chat app into a single Next.js application**. Self-hosted.
The author is non-technical-ish and works from a temporary Mac with NO local
node/npm — all builds run on the droplet or in GitHub Actions, never locally.

## Stack (as of the unification, v3)
- **Next.js 15 (App Router, React 19, TypeScript)** — one app serves everything:
  the publication (home, articles, topics, about/faq/search/debate), the AtheismIQ
  quiz, and the debate-chat + credits + article-review surfaces.
- **Prisma + PostgreSQL** (local on the droplet) for quiz/chat/credit/pipeline data.
- Runs as a persistent server on `127.0.0.1:8060` (pm2 app or systemd unit
  `artificial-atheist`). nginx is a thin TLS reverse proxy — NO static `_site` root,
  NO path-based split anymore (that was the old two-app glue).
- Live at https://artificialatheist.com (NON-www canonical). Droplet "Lab980",
  165.22.128.19. Webroot: /var/www/artificial-atheist.
- Deploy: git push → webhook → `deploy.sh` (git reset, `npm ci`, `npm run db:deploy`,
  `npm run build`, restart the service). See `deploy/`.
- AI: Claude via @anthropic-ai/sdk (articles, debate agent, moderation); OpenAI
  gpt-image-1-mini for illustrations. Keys in /etc/aa-admin.env (droplet) + Actions secrets.

## Architecture map
- **Publication (static, SSG):** rendered from markdown at build time.
  - `src/posts/*.md` — the articles (unchanged location, so the generator/buffer
    pipeline keeps working). Front-matter: `image, title, date, topic, excerpt, buffered`.
  - `lib/posts.ts` — reads/parses/renders posts (gray-matter + markdown-it).
  - `lib/site.ts` — site metadata + topic taxonomy + nav (ported from the old
    `src/_data/site.js`; single source of truth, imported directly — no /nav.json fetch).
  - `lib/art.ts` — seeded tessellation SVG (ported from the old `topicPattern` shortcode).
  - `lib/dates.ts` — luxon date/reading-time helpers (UTC, from the old .eleventy.js filters).
  - `components/site/pub.tsx` — ArtField/Thumb/Hero/PostCard/ListItem/TopicTag.
  - Routes: `app/page.tsx` (home), `app/posts/[slug]`, `app/topics/[topic]`,
    `app/about`, `app/faq`, `app/search` (client index search, replaces Pagefind),
    `app/debate`, `app/feed.xml`, `app/sitemap.xml`, `app/nav.json`,
    `app/search-index.json`, `app/not-found.tsx`.
  - Styling: `app/globals.css` (shared tokens/masthead/footer + Tailwind) +
    `app/publication.css` (article/home/topic layout, scoped under `.aa-pub`).
- **App surface (dynamic, DB-backed):** `app/(app)/…` route group (quiz, chat,
  account, pricing, leaderboard, result, review, signup, terms, privacy, age,
  unavailable) with its own width container; `app/api/…`; `lib/` (agent, auth,
  credits, payments, pipeline, geo, ratelimit, etc.); `prisma/`; `middleware.ts`.
- **Chat is still dark** (`CHAT_ENABLED=false`) pending the legal/DPA blockers in
  `LAUNCH-BLOCKERS.md`. The nav's "Debate" item is hidden while it's false.

## Critical gotchas
- **BUILD IS NO LONGER DESTRUCTIVE.** `next build` writes to `.next`; the running
  server keeps serving the old build until restarted, so a failed build can't 403
  the live site (the old Eleventy `rm -rf _site` hazard is gone). CI still guards it.
- **DUPLICATE SLUGS still break the build.** Article URLs are `/posts/<slug>/`
  where slug = filename minus the `YYYY-MM-DD-` prefix. Two files with the same
  slug collide in `generateStaticParams`. Check with:
  `ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d`  (must print nothing).
  Removing a post = `git rm` + commit + push (a bare `rm` gets resurrected by the next pull).
  The CI workflow (`ci.yml`) enforces this.
- **TRAILING SLASHES are canonical.** `next.config.mjs` sets `trailingSlash: true`
  so every publication URL keeps its historical trailing-slash form
  (`/posts/x/`, `/topics/science/`, `/about/`). Don't remove it — it would change
  every indexed URL. External POSTers to API routes (e.g. the Stripe webhook)
  must use the trailing-slash form.
- **DATES ARE UTC for articles** (date-only front-matter parsed in UTC in
  `lib/posts.ts` / `lib/dates.ts`). "Today" in the generator is still Pacific
  (America/Los_Angeles) — don't reintroduce `toISOString().slice(0,10)`.
- **IMAGES moved to `public/images/posts/`** (Next serves `public/` at web root;
  the URL is still `/images/posts/<slug>.png`). `illustrate.mjs` writes there now.
  16:9 (1536x864); illustrate.mjs falls back to 1536x1024. PNGs ~1.8MB, committed.
- **DB migrations:** `npm run db:deploy` (migrate deploy + idempotent seed) runs on
  every deploy and never wipes results. Never run `db:reset` on the droplet.

## Article pipeline (unchanged workflow, new image path)
- `scripts/generate.mjs` — scheduled article generator (writes markdown to
  `src/posts/`, calls illustrate + buffer). `npm run generate:test` runs it offline
  (AA_PROVIDER=mock + --dry-run) into gitignored `drafts/`.
- `scripts/illustrate.mjs` — AI art → `public/images/posts/<slug>.png`.
- `scripts/buffer.mjs` — auto-push new posts to Facebook via Buffer (GraphQL API,
  Bearer token). Reads the canonical URL from `SITE_URL`/`NEXT_PUBLIC_SITE_URL`
  env (fallback https://artificialatheist.com); no longer imports the old site.js.
  Stamps `buffered: true` so posts are never re-sent. `--backfill [n]` works the
  backlog; the buffer-backfill workflow runs it twice daily. Secret:
  BUFFER_ACCESS_TOKEN; optional repo var: BUFFER_PROFILE_IDS.
- Workflows: `ci.yml` (build + dup-slug guard), `generate.yml` (daily article),
  `illustrate.yml` (backfill art), `buffer.yml` / `buffer-backfill.yml`. Article/art
  commits stage `src/posts public/images/posts`.
- The DB-driven article pipeline (cluster→draft→scrub→review) lives in
  `lib/pipeline/` + `scripts/pipeline.ts` (`npm run pipeline:*`), gated at
  `/review/pipeline`. See `deploy/PIPELINE.md`.
- `tools/admin/` — the old standalone admin dashboard (separate node process,
  basic-auth at /admin/). Independent of the Next app; run it separately if wanted.

## Conventions
- Concise, blunt, analytical communication. Minimize formatting fluff.
- Verify changes by building (`npm run build`) and checking output; don't assume.
- On-site comments are OFF (discussion routed to Facebook via Buffer). Don't re-enable
  without asking. Keep the chat surface dark until LAUNCH-BLOCKERS.md clears.

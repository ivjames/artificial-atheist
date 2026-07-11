# Artificial Atheist — project notes for Claude Code

AI-authored publication (atheism / skepticism / critical thinking). Static site,
self-hosted. The author is non-technical-ish and works from a temporary Mac with
NO local node/npm — all builds run on the droplet or in GitHub Actions, never locally.

## Stack
- Eleventy (11ty) static generator, Node 20.
- Served by nginx from `_site/` on a DigitalOcean droplet ("Lab980", 165.22.128.19).
- Webroot: /var/www/artificial-atheist. Live at https://artificialatheist.com (NON-www canonical).
- Deploy: git push → webhook (adnanh/webhook on 127.0.0.1:9000) → droplet runs deploy.sh
  (git pull, npm install, npm run build). Scheduled post generator runs in GitHub Actions.
- AI: Claude (articles + comment moderation) via @anthropic-ai/sdk; OpenAI gpt-image-1-mini
  for illustrations. Keys in /etc/aa-admin.env (droplet) and GitHub Actions secrets.

## Critical gotchas (these have caused outages)
- BUILD IS DESTRUCTIVE: `npm run build` runs `rm -rf _site` first. If eleventy fails,
  _site is left empty → site returns 403. Always confirm `_site/index.html` exists after building.
- DUPLICATE SLUGS = FATAL BUILD: post URLs are slug-only (permalink in src/posts/posts.json).
  Two files with the same slug (e.g. a redated file + its old-dated original) cause
  DuplicatePermalinkOutputError and a zero-file build. Check with:
  `ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d`  (must print nothing).
  Removing a post requires `git rm` + commit + push — a bare `rm` gets resurrected by the next pull.
- DATES ARE PACIFIC: all "today" computations use America/Los_Angeles, not UTC
  (server is UTC). Don't reintroduce toISOString().slice(0,10).
- IMAGES: illustrations are 16:9 (1536x864). Hero/lead containers use aspect-ratio:16/9.
  illustrate.mjs falls back to 1536x1024 if the mini model rejects the wide size.
  Generated PNGs are ~1.8MB each and committed to the repo.

## Key files
- .eleventy.js — collections, date filters (luxon, zone:utc for date-only frontmatter),
  topicPattern shortcode (seeded tessellation art).
- src/_data/site.js — site metadata, topics taxonomy, monetization (Ko-fi donate on).
- src/_includes/ — base.njk (head, JSON-LD, OG), post.njk (article + hero), art.njk
  (tessellation + thumb macros).
- scripts/buffer.mjs — auto-push new posts to Facebook via Buffer (GraphQL API
  at api.buffer.com, Bearer token; the classic REST API rejects modern tokens).
  generate.mjs calls it after illustrating (non-fatal, best-effort). Sends the
  article URL as a Facebook linkAttachment (post type "post") so Facebook
  scrapes the per-post OG tags for a rich card; no image re-upload. The API key
  can publish but NOT enumerate channels (channels query returns FORBIDDEN), so
  BUFFER_PROFILE_IDS (repo var) must be set to the channel id. Skips silently if BUFFER_ACCESS_TOKEN is unset. Queues by
  default; BUFFER_NOW=1 publishes immediately. Targets BUFFER_PROFILE_IDS if set,
  else every connected Facebook profile. Manual re-share: `npm run buffer -- <post.md>`
  locally, or the "Share to Buffer" GitHub Action. Secret: BUFFER_ACCESS_TOKEN;
  optional repo var: BUFFER_PROFILE_IDS.
- scripts/generate.mjs — scheduled article generator. scripts/illustrate.mjs — AI art.
  Test mode: `npm run generate:test` (AA_PROVIDER=mock + --dry-run) runs the full
  parse/write pipeline offline — no API key, no cost, writes to gitignored drafts/,
  never touches src/posts. Add --dry-run to any real run to draft without publishing.
- tools/admin/ — web dashboard (Studio/Articles/Comments) at /admin/ behind basic auth.
  Comment system is built but the FRONT-END is removed; backend is dormant.

## Conventions
- Concise, blunt, analytical communication. Minimize formatting fluff.
- Verify changes by building and checking output; don't assume.
- Comments are OFF (discussion routed to Facebook via Buffer). Don't re-enable without asking.

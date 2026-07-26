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

## Article read model (markdown → DB mirror)
Markdown in `src/posts/` stays the source of truth (authoring, generator, and
static rendering are unchanged). On deploy, `scripts/sync-articles.ts`
(`npm run articles:sync`, called by `deploy.sh` after the build) mirrors the
published posts into the Prisma `Article` table so dynamic surfaces can
reference the corpus:
- `lib/articles.ts` — DB query helpers (get/list/search/relatedForLabels).
- `/api/articles?q=…` / `?topic=…` — read-only corpus search endpoint.
- **Cross-references:** a post's `related:` front-matter (YAML list or
  comma-separated slugs) becomes both the on-page "Related reading" links
  (`lib/posts.ts` `relatedPosts`, rendered statically — no DB needed) and the
  `Article.references` self-relation in the DB. No `related:` → falls back to
  same-topic.
- **Quiz** result page shows DB-backed "Keep reading" articles matched to the
  quiz's categories (`relatedForLabels`).
- **Chat** injects a short article "reference library" (top corpus matches for
  the visitor's message) as an un-cached context block so the agent can cite
  real posts by URL — never fabricated (`lib/agent/persona.ts`
  `articleReferenceBlock`, wired in `lib/agent/chat.ts`). The cached persona
  prefix is untouched, so prompt caching still hits.
- The sync is idempotent and prunes removed posts (guarded against an empty
  read). Run on the droplet (DB is local); the Actions generator can't reach it,
  which is why sync lives in `deploy.sh`, not the generate workflow.

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

## Prophecy analysis module (structured prophecy-claims knowledge base)
- Spec: `PROPHECY-HANDOFF.md`; integration plan + audit: `PROPHECY-PLAN.md`.
- Schema: `Prophecy*` models in `prisma/schema.prisma` (religion-neutral;
  source lists preserved verbatim, normalized claims mapped many-to-many,
  interpretations/fulfillments/evidence/objections/resolutions/evaluations
  kept as separate records; polymorphic targetType/targetId for evidence,
  citations, evaluations, revisions — app-layer integrity).
- Controlled vocabularies: `lib/prophecy/vocab.ts` (pure data), upserted
  idempotently on every deploy by `prisma/seed-prophecy.ts` via `seed.ts`.
- Data layer: `lib/prophecy/import.ts` (CSV/JSON, idempotent re-import),
  `claims.ts` (create/map/merge-with-provenance/search + revision snapshots),
  `export.ts` (JSON/CSV).
- Admin surface: `/review/prophecy` (same `aa_admin` cookie as the pipeline
  queue; NOT gated on CHAT_ENABLED). Dashboard, sources, source lists +
  paste-import + entry→claim mapping, claims search/status/merge, export.
- Tests: `tests/prophecy-vocab.test.ts` (pure) + `tests/prophecy-domain.test.ts`
  (pure + DB-integration gated on DATABASE_URL).
- Datasets (`data/prophecy/<slug>.{json,md}`, verbatim entries + provenance;
  `data/*` stays gitignored except `data/prophecy/`): `324-outoftheoverflow-2008`
  (claims 324, contains 315), `356-accordingtothescriptures` (URL says 353,
  page says 356 — the list grew in place; source of the 351/353/356 variants),
  `301-aboutbibleprophecy` (Ray Konig index lines only — copyright),
  `70-about-jesus` (also Konig), `jewishvoice-messianic` (15, no claimed total).
  Each .md has the droplet import walkthrough; imports are idempotent.
- AI normalization draft: `data/prophecy/claims-draft-v1.json` — 546 neutral
  claims + 1,080 entry mappings covering all 1,057 entries (per-passage-group;
  cross-passage merging left to humans). Provenance meta (model/promptVersion/
  generatedAt) is mandatory; loads as status=draft via the dashboard's "Load AI
  claim drafts" button (`lib/prophecy/draftload.ts`, idempotent, never touches
  human-edited claims). Spot-check at /review/prophecy/claims/?status=draft.
- Public surface (Phase 4): `app/(app)/prophecy/` — landing, claims index
  (search + category/subject filters + pagination), claim detail (verbatim
  source entries grouped by list with matchType/confidence/rationale, related
  claims, provenance naming the drafting model — the pages never assert human
  review of a claim, because per-claim review depth isn't tracked), source-list
  index + detail
  (claimed-vs-actual counts). Read model `lib/prophecy/public.ts` filters
  `status="published"` in EVERY query — unpublished claims 404 and are never
  linked; entries stay visible as provenance. No auth, no client components.
  `tests/prophecy-public.test.ts` pins the draft-invisibility rules.
  **Nav entry is still deliberately absent** from `lib/site.ts` until real
  claims are published — add it there when you're ready to surface it.
- Status: Phases 0–4 built. AI-drafted normalization awaits human review.
  Droplet steps after deploy: paste-import each list at /review/prophecy/lists/,
  click "Load AI claim drafts", then spot-check at
  /review/prophecy/claims/?status=draft and publish what passes (nothing shows
  publicly until you do). Next: cross-passage merges, evaluations/objections
  (Phase 5), optional AI assist (Phase 6).

## Adversary eval harness (debate-agent stress test)
- `lib/agent/adversary.ts` — the debate agent's opponent: a simulated apologist
  persona library. "Mental capacities" are modelled as composable DIALS
  (sophistication 1-5, verbosity, hostility, argument focus) plus a curated
  persona spectrum (professor→seeker→mystic→everyman→zealot→galloper→oneliner)
  and an apologetics ARGUMENTS catalog. Also holds `scoreAgentTurns` — pure
  heuristics over the agent's replies (engagement-hook endings, multi-question
  turns, length) that quantify the persona rules in `persona.ts`.
- `scripts/adversary.ts` (`npm run adversary`) — self-play harness: pits the
  apologist against the REAL debate agent (persona + model router, NOT the live
  chat/credits/DB path) for N rounds. Real Claude by default
  (ADVERSARY_PROVIDER/ADVERSARY_MODEL env); `--mock` for offline wiring checks,
  `--no-db` to skip persistence. CLI: `--persona <name|all>`, `--turns`,
  `--tier`, `--seed`, `--concurrency <n>` (run personas in parallel — only
  affects `--persona all`; a single conversation is inherently sequential;
  watch Anthropic rate limits), and dial overrides. Writes a markdown transcript to the
  gitignored `drafts/adversary/` AND persists each run to the `AdversaryRun`
  table (best-effort; DB is droplet-local, so run it there).
- `lib/adversaryRuns.ts` — read model + `aggregateStats` for the runs.
- **Review surface:** `/review/adversary` (admin-token gated, reuses the pipeline
  auth cookie; NOT gated on CHAT_ENABLED since it's an operator/eval tool). Shows
  aggregate + per-persona stats and every transcript. This is how you review the
  chats/stats from a browser instead of SSHing to read the markdown.

## Conventions
- Concise, blunt, analytical communication. Minimize formatting fluff.
- Verify changes by building (`npm run build`) and checking output; don't assume.
- On-site comments are OFF (discussion routed to Facebook via Buffer). Don't re-enable
  without asking. Keep the chat surface dark until LAUNCH-BLOCKERS.md clears.

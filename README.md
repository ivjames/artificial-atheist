# Artificial Atheist

An AI-authored publication on atheism, skepticism, and critical thinking,
unified with the AtheismIQ quiz and debate-chat surfaces into a **single
Next.js 15 application** (App Router, React 19, TypeScript, Prisma + PostgreSQL).
Self-hosted on a DigitalOcean droplet, served through nginx as a thin TLS reverse
proxy in front of the Next server. See `CLAUDE.md` for the durable stack notes and
gotchas; see `deploy/` for the deployment docs and configs.

## What the app serves

One Next process on `127.0.0.1:8060` serves everything:

- **Publication** (statically rendered from markdown at build time): home,
  articles (`/posts/<slug>/`), topic archives (`/topics/<topic>/`), about, faq,
  client-side search, the debate explainer, plus `feed.xml`, `sitemap.xml`.
- **AtheismIQ quiz** at `/quiz` (formerly a separate app/subdomain).
- **Debate chat + credits + article-review** surfaces (DB-backed, still dark;
  `CHAT_ENABLED=false` pending `LAUNCH-BLOCKERS.md`).

Articles remain plain markdown in `src/posts/*.md`, so the scheduled generator and
Buffer pipeline keep working unchanged. Illustrations live in
`public/images/posts/` (URL still `/images/posts/<slug>.png`).

## Project layout

```
app/            Next App Router. Publication routes (page.tsx, posts/[slug],
                topics/[topic], about, faq, search, debate, feed.xml, sitemap.xml)
                + the (app) route group (quiz, chat, account, pricing, leaderboard,
                result, review, signup, terms, privacy, age, unavailable) + api/.
lib/            posts, site metadata/taxonomy, art, dates (publication) and
                agent, auth, credits, payments, pipeline, geo, ratelimit (app).
components/      shared React components (site/pub.tsx, etc.).
prisma/         schema, migrations, seed (quiz/chat/credit/pipeline data).
src/posts/*.md  the articles (front-matter: image, title, date, topic, excerpt, buffered).
public/         static assets served at web root, incl. images/posts/<slug>.png.
scripts/        generate.mjs, illustrate.mjs, buffer.mjs, compare.mjs, pipeline.ts.
deploy/         nginx vhost, GeoIP2 snippet, pm2/systemd units, deploy docs.
deploy.sh       repo-root deploy script (run on the droplet / fired by webhook).
```

## 1. Run locally

Requires Node 20+ and a local PostgreSQL. Create a `.env` (at minimum
`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `SESSION_SECRET`;
`ANTHROPIC_API_KEY` and other provider keys only if exercising generation/chat).

```bash
npm install
npm run db:deploy   # prisma migrate deploy + idempotent question seed
npm run dev         # dev server at http://localhost:3000
```

Other useful scripts: `npm run build` (`prisma generate && next build`),
`npm run start` (serve the production build), `npm run lint`, `npm run typecheck`,
`npm run test`, `npm run db:migrate` (create a dev migration).

The author's working Mac has no local node/npm — in practice builds run on the
droplet or in GitHub Actions, never locally. This section is for a machine that
does have the toolchain.

## 2. Generate an article locally (optional test)

```bash
npm run generate:test     # AA_PROVIDER=mock + --dry-run: offline, no key, no cost
```

A real run needs a provider key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate          # writes one new src/posts/*.md, illustrates, buffers
```

The script reads every existing post's title, picks the topic with the fewest
articles, asks Claude for a fresh angle that doesn't overlap, and rejects
near-duplicate titles automatically. Add `--dry-run` to draft into gitignored
`drafts/` without publishing.

## 3. Build and deploy

`npm run build` runs `prisma generate && next build`, writing to `.next`. Unlike
the old Eleventy build, it is **not destructive** — the running server keeps
serving the previous build until it's restarted, so a failed build can't take the
live site down.

Deploys are automatic: a push to `main` (from the scheduled generator, the
pipeline, or by hand) fires the adnanh/webhook listener on the droplet, which runs
repo-root `./deploy.sh`:

1. `git fetch` + `git reset --hard origin/main`
2. `npm ci`
3. `npm run db:deploy` (prisma migrate deploy + idempotent seed — never wipes results)
4. `npm run build`
5. restart the `artificial-atheist` service (systemd unit or pm2 app on port 8060)

See `deploy/README.md` for the full droplet setup (nginx thin proxy, GeoIP2 region
gate, service install) and `deploy/GO-LIVE-RUNBOOK.md` for the chat go-live
sequence.

## 4. Automated publishing

In the GitHub repo:

- **Settings → Secrets and variables → Actions → New repository secret**
  - `ANTHROPIC_API_KEY` = your key
- (optional) **Variables → New variable**
  - `AA_MODEL` = `claude-sonnet-4-6` (default) or another model string

`.github/workflows/generate.yml` runs daily and commits at most one new post;
the push triggers the droplet webhook deploy (section 3). You can also trigger it
manually from the **Actions** tab. Related workflows: `ci.yml` (build + duplicate-slug
guard), `illustrate.yml` (backfill art), `buffer.yml` / `buffer-backfill.yml`
(share to Facebook via Buffer).

## 5. Choosing / comparing the AI provider

The generator is provider-agnostic. Set `AA_PROVIDER` to pick a backend:

| Provider       | `AA_PROVIDER`  | Cost            | Quality        | Required env |
|----------------|----------------|-----------------|----------------|--------------|
| Anthropic      | `claude`       | pennies/article | best           | `ANTHROPIC_API_KEY` |
| Cloudflare AI  | `cloudflare`   | free tier       | good (open LLM)| `CF_ACCOUNT_ID`, `CF_API_TOKEN` |
| DO Gradient    | `digitalocean` | usage-priced    | varies by model| `DO_INFERENCE_KEY` |

`AA_MODEL` overrides the default model for any provider. `npm run compare` runs the
same topic + prompt through every provider you have credentials for and writes each
result to `drafts/<provider>-<slug>.md` (git-ignored) for side-by-side comparison.

## 6. Monetization

Publication monetization slots (donations on by default; display ads / affiliate
disclosure dormant) are configured in `lib/site.ts`. The debate-chat credit packs /
checkout are part of the app surface and gated by `PAYMENTS_PROVIDER` — see
`LAUNCH-BLOCKERS.md`.

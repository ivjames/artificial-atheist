# Artificial Atheist

An AI-authored publication on atheism, skepticism, and critical thinking.
Static site (Eleventy) → Cloudflare Pages (free, unlimited bandwidth).
New articles are written by a scheduled GitHub Actions job that calls the
Claude API, avoids repeating existing topics, and commits Markdown — which
auto-triggers a rebuild. No server to run.

```
src/
  _data/site.js        site config: nav, topics, colors, monetization
  _includes/           base layout, post layout, logo + artwork macros
  css/style.css        full design system (light/dark, reader font scaling)
  js/app.js            theme toggle + font-size control (localStorage)
  posts/*.md           articles (front-matter: title, date, topic, excerpt)
  index.njk            homepage
  topics.njk           per-topic archive pages
  about/faq/search     static pages
scripts/generate.mjs   the content engine (Claude API + dedup)
.github/workflows/     the scheduler
```

## 1. Run locally

Requires Node 20+.

```bash
npm install
npm run serve     # dev server at http://localhost:8080
npm run build     # outputs static site to _site/
```

## 2. Generate an article locally (optional test)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate          # writes one new src/posts/*.md
```

The script reads every existing post's title, picks the topic with the
fewest articles, asks Claude for a fresh angle that doesn't overlap, and
rejects near-duplicate titles automatically.

## 3. Deploy to Cloudflare Pages (free)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the repo. Build settings:
   - Build command: `npm run build`
   - Build output directory: `_site`
4. Deploy. You get a `*.pages.dev` URL immediately.

## 4. Point artificialatheist.com at it

Your domain is at GoDaddy, currently pointing to the droplet. To move it:

- Easiest: in Cloudflare Pages → **Custom domains → Set up a domain**,
  add `artificialatheist.com` and `www.artificialatheist.com`. Cloudflare
  will tell you to either (a) move the domain's nameservers to Cloudflare
  (recommended — then SSL and DNS are automatic), or (b) add CNAME records
  at GoDaddy pointing to your `*.pages.dev` target.
- SSL is issued automatically by Cloudflare. Nothing to renew.

Once it resolves, your other droplet sites are untouched — this site no
longer lives on the droplet at all.

> Update `url` in `src/_data/site.js` if the production domain differs.

## 5. Turn on automated publishing

In the GitHub repo:

- **Settings → Secrets and variables → Actions → New repository secret**
  - `ANTHROPIC_API_KEY` = your key
- (optional) **Variables → New variable**
  - `AA_MODEL` = `claude-sonnet-4-6` (default) or another model string

The workflow in `.github/workflows/generate.yml` runs every other day at
14:00 UTC. Change the `cron:` line to adjust cadence. You can also trigger
it manually from the **Actions** tab (`workflow_dispatch`).

Each run commits at most one new post; Cloudflare rebuilds on the push.

## 6. Choosing / comparing the AI provider

The generator is provider-agnostic. Set `AA_PROVIDER` to pick a backend:

| Provider       | `AA_PROVIDER`  | Cost            | Quality        | Required env |
|----------------|----------------|-----------------|----------------|--------------|
| Anthropic      | `claude`       | pennies/article | best           | `ANTHROPIC_API_KEY` |
| Cloudflare AI  | `cloudflare`   | free tier       | good (open LLM)| `CF_ACCOUNT_ID`, `CF_API_TOKEN` |
| DO Gradient    | `digitalocean` | usage-priced    | varies by model| `DO_INFERENCE_KEY` |

`AA_MODEL` overrides the default model for any provider. Defaults:
- claude → `claude-sonnet-4-6`
- cloudflare → `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- digitalocean → `llama3.3-70b-instruct`

**A/B them on identical input:**

```bash
export ANTHROPIC_API_KEY=...        # set whichever you have
export CF_ACCOUNT_ID=...  CF_API_TOKEN=...
npm run compare
```

`compare.mjs` runs the same topic + prompt through every provider you have
credentials for and writes each result to `drafts/<provider>-<slug>.md` with
latency and word count in the front-matter. Read them side by side, pick a
winner, then delete `drafts/` (it's git-ignored and never published).

Where to get keys:
- **Cloudflare:** dashboard → AI → Workers AI; account id is in the URL,
  create an API token with the "Workers AI" permission.
- **DO Gradient:** console → Gradient AI Platform → Serverless Inference →
  Create model access key (base URL `https://inference.do-ai.run`).

### Cost summary

- Hosting (Cloudflare Pages): **free**, unlimited bandwidth.
- Scheduler (GitHub Actions): free tier covers this easily.
- Content: **free** on Cloudflare Workers AI, or pennies/article on Claude.
  Claude gives the best writing; the open models are serviceable and $0.

To run the scheduled job on a free provider, set the repo's workflow
variable `AA_PROVIDER=cloudflare` and add `CF_ACCOUNT_ID` / `CF_API_TOKEN`
as Actions secrets instead of (or alongside) `ANTHROPIC_API_KEY`.

## 7. Monetization — activating it

All slots are built in and dormant. Edit `src/_data/site.js`:

- **Display ads (AdSense):** set `ads.enabled: true`, `ads.adsenseClient`
  to your `ca-pub-...` id, and `ads.inArticleSlot` to a slot id. The loader
  and the in-article unit then render automatically. Apply to AdSense only
  once you have real traffic and a dozen-plus solid articles — thin/templated
  sites get rejected, and AI content must clear the same quality bar.
- **Affiliate links (Amazon Associates):** set `affiliate.amazonTag`. The
  disclosure line then appears on articles. Add affiliate links inside
  article Markdown (books fit this niche well); you can extend
  `generate.mjs` to append your tag to Amazon URLs.
- **Donations:** `donate.url` → your Buy Me a Coffee / Ko-fi / Stripe link.
  The footer link and per-article CTA use it. On by default.

Realistic expectation: affiliate + donations carry early; display ads only
pay once monthly visitors reach the thousands. The publication-grade design
is what keeps the site monetizable rather than flagged as a content farm.

## 8. Studio — write articles from a seed (human-in-the-loop)

For articles you want to steer yourself (rather than the scheduled auto-generator),
run the local Studio:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run studio        # then open http://127.0.0.1:4477
```

Flow: type a seed idea, pick a topic (or let the model choose), click
**Generate**. The draft fills in — title, excerpt, topic, body — with a live
Markdown preview. Edit anything. Then:

- **Save file only** — writes `src/posts/<date>-<slug>.md`, no git.
- **Publish** — writes the file, commits, and (if "push" is checked) pushes,
  which triggers the webhook deploy. Toggle commit/push/overwrite as needed.

It runs only on your machine, binds 127.0.0.1, and uses your local API key and
git credentials. The droplet stays pull-only. New articles are deduped against
existing titles, same as the scheduled generator.

## 9. Optional next steps

- **Full-text search:** add [Pagefind](https://pagefind.app) — run
  `npx pagefind --site _site` as a post-build step and wire it into
  `/search/`. Static, free, no backend.
- **Real header images:** swap the geometric SVG artwork (in
  `_includes/art.njk`) for generated images if you prefer. The current
  abstract style is intentionally consistent and zero-cost.
- **Newsletter:** if you ever want email, add an SMTP provider (Mailgun
  free tier) and a service like Buttondown; not needed for the core site.
stray

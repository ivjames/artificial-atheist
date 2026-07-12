# Artificial Atheist — Project Audit

_State, gaps, and recommendations. Generated 2026-07-12 from a full read of the repo,
a clean `npm run build`, and live probes of artificialatheist.com._

## 1. Current state (what's working)

The project is healthy and shipping. Nothing here is on fire.

- **Build is green.** `npm run build` succeeds, emits `_site/index.html`, indexes 60 pages
  with Pagefind, finishes in ~0.16s. No duplicate slugs (the recurring fatal-build cause).
- **Content pipeline is live.** 60 articles, balanced across topics
  (religion 15, science/philosophy/secularism 14 each, news 3 hand-written). Every post has
  a committed 16:9 illustration and `image:` frontmatter — no missing art.
- **Automation runs.** The daily GitHub Actions generator (`0 14 * * *`) produced today's
  post; illustrate + Buffer-to-Facebook steps are wired in as non-fatal best-effort.
- **Live site is up and correct.** Root returns HTTP 200 (served by **nginx on the droplet**),
  and `www.artificialatheist.com` **301-redirects to non-www** — the HANDOFF's open www-redirect
  item is done.
- **SEO/meta foundation is solid.** JSON-LD (Org/WebSite/Article), OpenGraph + Twitter cards,
  canonical URLs, Atom feed with image enclosures, robots.txt, GA4 installed.

## 2. Gaps

### HIGH

1. **Destructive build has no safety net.** `npm run build` runs `rm -rf _site` *before*
   Eleventy. If a build fails (a bad post, a template typo, an OOM on the 512MB droplet),
   `_site` is left empty and the live site returns 403. This is documented in `CLAUDE.md`
   and `HANDOFF.md` as the #1 outage cause but is **still unmitigated**. The deploy pulls
   and builds in place on the production webroot — there is no atomic swap.

2. **The scheduled generator fails silently.** Posts are daily Jul 3–9, then **nothing on
   Jul 10 and Jul 11**, resuming Jul 12. The cron is daily, so two runs produced no article.
   `generate.mjs` exits 0 on a dedup collision ("Title too similar… Skipping") and the
   workflow just logs "No new post this run" — **no alert, no signal.** As the corpus grows
   against only 4 rotating topics, near-duplicate collisions get more frequent, so the site
   will quietly stop publishing and nobody will know.

3. **Documentation contradicts reality.** Two of the setup docs describe a system that isn't
   the one running:
   - `README.md` says the site deploys to **Cloudflare Pages** ("No server to run",
     "no longer lives on the droplet at all"). Live headers say **nginx on the droplet**, and
     `deploy.sh` + `CLAUDE.md` + `ADMIN-SETUP.md` confirm the droplet+webhook model. The README
     is stale/aspirational and will mislead the next operator (or the next Claude session).
   - `COMMENTS-SETUP.md` describes on-site comments as **live** ("Comments appear on every
     article automatically"), but `CLAUDE.md`/`HANDOFF.md` say the front-end was **removed** and
     the backend is dormant. Confirmed: no comment markup in templates or `app.js`.

### MEDIUM

4. **AdSense is half-wired — costs, earns nothing.** `site.js` has `ads.enabled: true` and a
   real `ca-pub-...` client, so `base.njk` loads `adsbygoogle.js` on **every page**. But
   `inArticleSlot` is empty, so **no ad unit ever renders** (zero revenue), and there is **no
   `ads.txt`** — confirmed 404 live. Net effect: the AdSense script loads sitewide with no
   inventory and no ads.txt, which triggers AdSense's "ads.txt not found" warning and is the
   worst of both worlds (policy exposure, no income).

5. **Sitemap omits all topic pages.** `sitemap.njk` iterates `site.topics` (an object) with a
   single loop var — a Nunjucks foot-gun that yields nothing. Built sitemap has **64 URLs
   (4 static + 60 posts + 0 topics)**; the 5 topic archive pages (`/topics/science/` etc.),
   which do exist in the build, are never listed. Minor SEO leak.

6. **Repo is heavy and growing.** 60 committed PNGs = **104 MB** in `src/images/posts/`,
   `.git` is **117 MB**, growing ~1.7 MB every day a post publishes. No compression/WebP step.
   Clones and droplet deploys get slower over time; nothing broken yet.

7. **No custom 404 page.** No `src/404.*`; visitors to dead URLs get nginx's default rather
   than a branded page with nav back into the site.

### LOW / hygiene

8. **No CI build check.** A push that breaks the build (bad post, template error) isn't caught
   until the droplet tries to deploy it — and then 403s the live site (see #1). A trivial
   "run `npm run build` on PRs/pushes" Action would catch it before it ships.
9. **Default generation model may be stale.** `providers.mjs` defaults to `claude-sonnet-4-6`.
   Generation clearly still works, so a valid `AA_MODEL` is likely set — but worth confirming
   the id is current rather than relying on an override.
10. **No `LICENSE`**, no `.github/dependabot.yml`, no `SECURITY.md`. Deps float on `^` ranges
    (fine, lockfile present) but nothing flags CVEs.
11. **`.nvmrc` pins 20**; fine, just note workflows and droplet should match.

## 3. Recommendations (prioritized)

| # | Action | Why | Effort |
|---|--------|-----|--------|
| 1 | **Atomic deploy.** Build to a temp dir, then `mv`/symlink-swap into the webroot only on success. Update `deploy.sh` + `package.json`. | Kills the #1 historical outage — a failed build can never 403 the live site. | S |
| 2 | **Alert on empty generator runs.** Have the workflow open an issue / ping on "No new post" or a non-zero generate exit, and/or broaden the topic pool so dedup stops starving. | You'll know the day publishing stops instead of weeks later. | S |
| 3 | **Fix the docs.** Rewrite `README.md` to the actual droplet+webhook deploy (or delete the Cloudflare sections); mark `COMMENTS-SETUP.md` as dormant/archived. | Prevent a future operator acting on false infra assumptions. | S |
| 4 | **Decide AdSense: on or off.** If off, set `ads.enabled: false` so the script stops loading. If on, add a real `inArticleSlot` **and** commit `src/ads.txt` (`google.com, pub-7805599315918388, DIRECT, f08c47fec0942fa0`) with a passthrough copy in `.eleventy.js`. | Stop loading an ad script that earns nothing and warns; actually monetize or go clean. | S |
| 5 | **Add a CI build check.** GH Action on PR/push: `npm ci && npm run build && test -f _site/index.html` + the duplicate-slug guard. | Catches broken builds before the droplet does. | S |
| 6 | **Fix the sitemap topics loop** (`{% for key, tp in site.topics %}` → `/topics/{{ key }}/`). | Restores 5 indexable pages. | XS |
| 7 | **Compress images.** Add a build/commit step (pngquant or WebP output) — or stop committing PNGs and serve from object storage. | Caps repo growth before it hurts clone/deploy time. | M |
| 8 | **Add a branded `src/404.html`.** | Better UX + keeps bounced visitors on-site. | XS |
| 9 | Add `LICENSE`, `dependabot.yml`, verify the default model id. | Standard hygiene. | S |

**Suggested order:** 1 → 2 → 3 → 4 → 5 → 6 (the top four remove real risk/cost; 5–6 are quick wins).
None of these are emergencies — the site works today. They're the difference between "runs" and
"runs unattended without quietly breaking."

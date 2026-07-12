# HANDOFF — audit remediation

Delegation-ready work items derived from `AUDIT.md` (2026-07-12). Each card is
self-contained: a fresh session or agent should be able to execute it without
re-discovering context. Read `CLAUDE.md` first for the durable gotchas
(destructive build, duplicate slugs, Pacific dates). Treat this as a checklist —
delete items as they land.

## How to use this file
- **Autonomous** cards can be picked up and shipped as-is.
- **Decision-gated** cards need the owner (ivjames@gmail.com) to answer one
  question before work starts — that question is called out at the top of the card.
- Every card lists an **Acceptance check** — the delegate is done only when it passes.
- Standard loop for any card touching the site: make the change → `npm run build`
  → confirm `_site/index.html` exists → run the duplicate-slug guard
  (`ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d`, must be empty)
  → commit → push. One card = one focused commit/PR.

## Suggested order
Risk-first: **T1 → T2 → T3 → T5 → T6**, then the decision-gated **T4 / T9**,
then **T7 → T8**. T6 is trivial and a good warm-up. T1/T2/T3 remove real
operational risk; T5/T6 are quick SEO/CI wins.

---

## T1 — Atomic deploy (build can never 403 the live site) · autonomous · S
**Problem:** `npm run build` runs `rm -rf _site` before Eleventy. A failed build
leaves `_site` empty and the droplet's nginx returns 403. Deploy builds in place
on the production webroot with no swap. (Audit HIGH #1.)

**Files:** `package.json` (scripts), `deploy.sh`, note for the droplet's nginx webroot.

**Approach:**
- Build into a scratch dir, verify it, then swap into place only on success. e.g.
  `eleventy --output=_site.new && pagefind --site _site.new` then
  `rm -rf _site.prev; mv _site _site.prev 2>/dev/null; mv _site.new _site`.
- Keep the swap on the same filesystem so the `mv` is instant. `set -e` in
  `deploy.sh` already aborts before the swap if the build fails, leaving the old
  `_site` serving.

**Acceptance check:** temporarily break a template so the build fails; confirm the
previous `_site/index.html` still serves and is unchanged. Revert; confirm a clean
build swaps in new content and `_site/index.html` exists.

**Gotchas:** Eleventy's output dir is `_site` in `.eleventy.js` — override via CLI
flag, don't hardcode a second path in config. Pagefind must index the scratch dir,
not the old one. Don't touch the Pacific-date logic. Confirm the actual webroot
(`/var/www/artificial-atheist`, nginx serves `_site/`).

---

## T2 — Surface silent generator misses · autonomous · S–M
**Problem:** posts are daily Jul 3–9, then **none Jul 10–11**, resuming Jul 12.
A dedup collision makes `generate.mjs` exit 0 and the workflow logs "No new post"
with no alert. As the corpus grows against 4 rotating topics, this starves and the
site quietly stops publishing. (Audit HIGH #2.)

**Files:** `.github/workflows/generate.yml`, `scripts/generate.mjs`.

**Approach (two parts):**
1. *Visibility:* when a run produces no post, don't stay silent — either fail the
   job so GitHub emails the owner, or (nicer) open/update a single tracking issue
   via `actions/github-script`. Don't open a new issue every day; update one.
2. *Root cause:* reduce dedup starvation. Cheapest: on a `tooSimilar` rejection,
   retry the LLM up to ~3× feeding the rejected title back with "avoid this angle"
   before giving up. Optionally widen the topic/subtopic pool.

**Acceptance check:** simulate a collision (point the generator at a corpus that
forces `tooSimilar`) and confirm the run surfaces it (job failure or issue update).
Confirm a normal run still commits exactly one post + its illustration.

**Gotchas:** keep the existing "commit post AND illustration together" logic (a
post committed without its PNG = broken hero). Non-fatal illustrate/Buffer steps
must stay non-fatal. Respect `AA_DATE` / Pacific date.

---

## T3 — Reconcile docs with reality · autonomous · S
**Problem:** `README.md` says the site deploys to **Cloudflare Pages** ("No server
to run", "no longer lives on the droplet"). Live headers say **nginx on the
droplet**; `deploy.sh` + `CLAUDE.md` + `ADMIN-SETUP.md` confirm droplet+webhook.
`COMMENTS-SETUP.md` describes on-site comments as live, but they were removed and
the backend is dormant. (Audit HIGH #3.)

**Files:** `README.md`, `COMMENTS-SETUP.md`.

**Approach:**
- Rewrite README's hosting/deploy sections to the real model (git push → webhook →
  droplet `deploy.sh`: git pull, npm install, build). Remove or clearly mark the
  Cloudflare Pages walkthrough as not-current. Keep the still-accurate
  provider/monetization/Studio sections.
- Add a banner at the top of `COMMENTS-SETUP.md`: dormant/archived, comments are
  OFF by design (discussion routes to Facebook via Buffer), do not re-enable
  without an explicit decision (per `CLAUDE.md`).

**Acceptance check:** README's hosting description matches the live stack; no
"Cloudflare Pages" / "no server to run" claims presented as current;
`COMMENTS-SETUP.md` is unambiguously labeled dormant.

**Gotchas:** documentation only — do NOT change deploy behavior or re-enable
comments. `CLAUDE.md` is the source of truth; align to it.

---

## T4 — Resolve AdSense · DECISION-GATED · S
**Owner decision needed first:** turn display ads **OFF**, or **finish wiring them ON**?
Right now `ads.enabled: true` + a real client id loads `adsbygoogle.js` on every
page, but `inArticleSlot` is empty (no ad renders) and there's **no `ads.txt`**
(live 404) — so it earns nothing and triggers AdSense's "ads.txt not found"
warning. (Audit MEDIUM #4.)

**Files:** `src/_data/site.js`; if ON: `src/ads.txt` (new), `.eleventy.js` (passthrough copy).

**If OFF:** set `ads.enabled: false`. Acceptance: `adsbygoogle.js` no longer in page source.

**If ON:**
- Get a real in-article slot id from the AdSense console → set `ads.inArticleSlot`.
- Create `src/ads.txt` with the account's line (from AdSense → Sites → ads.txt;
  it looks like `google.com, pub-7805599315918388, DIRECT, f08c47fec0942fa0` —
  **verify the exact line in the account before committing**).
- Add `eleventyConfig.addPassthroughCopy({ "src/ads.txt": "ads.txt" });` in `.eleventy.js`.
- Acceptance: after deploy, `curl -s -o /dev/null -w "%{http_code}" https://artificialatheist.com/ads.txt` → 200 and serves the pub line; an ad unit renders in-article; AdSense stops warning.

**Gotchas:** don't ship an ad script with no inventory. AI content must clear
AdSense's quality bar. Verify the ads.txt relationship line against the live
account, don't trust the placeholder above.

---

## T5 — CI build check on PRs/pushes · autonomous · S
**Problem:** a push that breaks the build isn't caught until the droplet deploys it
— and then 403s the live site (see T1). (Audit LOW #8.)

**Files:** `.github/workflows/ci.yml` (new).

**Approach:** on `pull_request` and pushes to feature branches, run `npm ci`,
`npm run build`, assert `_site/index.html` exists, and run the duplicate-slug guard
(fail if it prints anything). No API keys required — build is Eleventy + Pagefind
only; article generation is separate.

**Acceptance check:** a PR that breaks a template or adds a duplicate slug goes red;
a clean PR goes green. Keep it under ~2 min.

**Gotchas:** don't run the generator in CI (needs secrets, not the point). Match
Node 20 (`.nvmrc`).

---

## T6 — Fix sitemap topic pages · autonomous · XS (good warm-up)
**Problem:** `sitemap.njk` iterates `site.topics` (an object) with a single loop
var, which yields nothing — the built sitemap has 64 URLs (4 static + 60 posts +
**0 topic pages**), omitting the 5 `/topics/*/` archives that exist in the build.
(Audit MEDIUM #5.)

**Files:** `src/sitemap.njk`.

**Approach:** change the loop to `{%- for key, tp in site.topics %}` and emit
`/topics/{{ key }}/`.

**Acceptance check:** `npm run build` then `grep -c '<loc>' _site/sitemap.xml` → **69**
(4 static + 5 topics + 60 posts); topic URLs present.

**Gotchas:** none — one-line fix.

---

## T7 — Cap image/repo weight · DECISION-GATED (approach) · M
**Problem:** 60 committed PNGs = 104 MB, `.git` = 117 MB, growing ~1.7 MB per
published day, no compression. Slows clones/deploys over time. (Audit MEDIUM #6.)

**Owner decision:** compress-in-place PNG (low risk, ~60–70% smaller, no template
changes) **or** switch to WebP (smaller still, but touches templates + feed
enclosure type + OG compatibility). Recommend **PNG/pngquant first**.

**Files (pngquant path):** `scripts/illustrate.mjs` (compress after generate), plus
a one-time backfill of the existing 60.

**Approach:** run generated PNGs through pngquant (or `sharp`) before writing; add a
backfill command mirroring the `--all` pattern. Keep the `image:` frontmatter path
(`/images/posts/<slug>.png`) so templates/OG/feed are untouched.

**Acceptance check:** new + backfilled images materially smaller; `npm run build`
OK; hero, `og:image`, and feed enclosures still valid; a live post still renders
its image and the Facebook/Buffer card still scrapes `og:image`.

**Gotchas:** this shrinks the **working tree, not git history** (the fat blobs
remain in `.git`; a history rewrite is separate and risky — out of scope, note it
for later). `gpt-image-1-mini` returns PNG b64; `sharp` would be a new dependency —
weigh vs pngquant CLI. If WebP is chosen, also update `feed.njk` enclosure `type`
and any `image/png` assumptions.

---

## T8 — Branded 404 page · autonomous · XS–S
**Problem:** no custom 404; dead URLs get nginx's default. (Audit MEDIUM #7.)

**Files:** `src/404.html` (or `.njk` using `base.njk`); note for droplet nginx.

**Approach:** add a 404 template using the site layout with nav back in. Eleventy
outputs `_site/404.html`. For nginx to actually serve it on a miss, add
`error_page 404 /404.html;` to the site's 443 server block (droplet config change —
document it in the card/commit; the static build alone won't wire it up).

**Acceptance check:** build emits `_site/404.html`; after the nginx directive, a
dead URL returns the branded page with a 404 status.

**Gotchas:** the nginx `error_page` line is a droplet-side change, not in-repo —
call it out so the deploy step includes it.

---

## T9 — Hygiene: LICENSE, dependabot, model-id check · partly DECISION-GATED · S
(Audit LOW #9–11.)

**Files:** `LICENSE` (new), `.github/dependabot.yml` (new), `scripts/providers.mjs`.

- **LICENSE — decision-gated:** owner picks a license (code vs AI-generated content
  have different considerations). Add once chosen.
- **dependabot — autonomous:** add `.github/dependabot.yml` for the `npm` and
  `github-actions` ecosystems, weekly.
- **Model id — autonomous, verify:** `providers.mjs` defaults to
  `claude-sonnet-4-6`. Generation works today (likely an `AA_MODEL` repo var
  overrides it), but confirm the default id is a current, valid model and bump if
  not — verify with a real or mock generate run before relying on it.

**Acceptance check:** LICENSE present (post-decision); dependabot opens update PRs;
default model id confirmed valid (a `npm run generate:test` smoke run passes and,
for the real id, a live generate succeeds).

**Gotchas:** don't break the daily generator when touching the model id — test
first. LICENSE choice is the owner's call.

---

## Decision summary (owner input before delegating)
- **T4** — AdSense OFF, or finish wiring ON (need a slot id + verified ads.txt line).
- **T7** — image approach: pngquant-in-place (recommended) vs WebP.
- **T9** — which LICENSE.

Everything else (T1, T2, T3, T5, T6, T8, plus the dependabot/model parts of T9) is
ready to delegate now.

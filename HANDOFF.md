# HANDOFF — open threads

State of play as the project moves to Claude Code. Read `CLAUDE.md` first for the
durable stuff (stack, gotchas, conventions); this file is just "where we left off."
Treat it as a checklist — delete items as they're done.

## Important context about this working copy vs. the live repo
The chat assistant's working copy lagged behind the live GitHub repo (the scheduled
generator and Studio added posts it never saw). **Never wholesale-overwrite `src/posts/`
or the repo from an old bundle** — it deletes newer posts. The live repo on the droplet /
GitHub is the source of truth. Apply changes file-by-file.

## 1. Regenerate illustrations at 16:9 (IN PROGRESS — highest priority)
The art system was just switched from portrait/3:2 to **16:9 (1536x864)**, and the
hero/lead containers now use `aspect-ratio: 16/9`. The existing PNGs on the droplet are
the OLD portrait images and must be replaced.

On the droplet:
```bash
cd /var/www/artificial-atheist
export OPENAI_API_KEY=sk-...
rm -f src/images/posts/*.png        # clear old portrait images
node scripts/illustrate.mjs --all   # regenerate all as 16:9
npm run build && ls _site/index.html && echo OK
git add -A && git commit -m "Regenerate 16:9 illustrations" && git push
```
- Generate ONE first and eyeball it before the full `--all`:
  `node scripts/illustrate.mjs scientific-skepticism`
- Watch the log for `size 1536x864 rejected; retrying at 1536x1024`. If the mini model
  won't do 16:9, either accept the 3:2 fallback (CSS crops it to the 16:9 band, fine) or
  set `AA_IMAGE_MODEL=gpt-image-1` (full model, ~$0.016/img) for true 16:9.
- The `STYLE` prompt in `scripts/illustrate.mjs` is a first pass — tune wording after
  seeing real output. Cheap to iterate.

## 2. Deploy the pending CSS/template/script changes
If not already pushed, these files changed and need to be live:
`scripts/illustrate.mjs`, `src/css/style.css`, `src/_includes/base.njk`,
`src/_includes/post.njk`, `src/_includes/art.njk`, `src/index.njk`, `src/topics.njk`,
`src/feed.njk`, `src/_data/site.js`, `.eleventy.js`, `package.json`,
`tools/admin/server.mjs`, `tools/admin/index.html`.
Confirm with `git status` / `git log` on the droplet what's actually deployed.

## 3. nginx www → non-www redirect (verify it's applied)
Canonical is non-www everywhere (site.url, sitemap, robots, OG, JSON-LD). The nginx
443 block must redirect `www.artificialatheist.com` → `artificialatheist.com`, or www
serves a duplicate. Check:
```bash
curl -sI https://www.artificialatheist.com/ | grep -i location   # want: location: https://artificialatheist.com/
```
If missing, split the 443 server block: a www-only block that does
`return 301 https://artificialatheist.com$request_uri;`, and the main block with
`server_name artificialatheist.com;`. Cert already covers www (it served www before).

## 4. Google Search Console — submit the sitemap
Highest-impact SEO action and not yet done. Sitemap is real and auto-regenerates:
`https://artificialatheist.com/sitemap.xml`. Submit it in Search Console once the
www-redirect is confirmed. (robots.txt already points at it.)

## 5. Duplicate-slug hygiene (recurring outage cause)
The bulk date-rename kept creating new-dated files without `git rm`-ing the originals,
causing repeated `DuplicatePermalinkOutputError` build failures (→ 403). Before every
push that touches posts, run:
```bash
ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d
```
Must print nothing. Removing a post = `git rm` + commit + push (bare `rm` gets
resurrected by the next pull).

## Deferred / nice-to-have (not urgent)
- **Image weight:** PNGs are ~1.8MB each, committed to the repo (~1.8MB/post growth).
  Consider a build step to compress (pngquant) or output WebP once the site is stable.
- **Safer deploy:** `npm run build` does `rm -rf _site` first, so a failed build 403s the
  live site. Consider building to a temp dir and swapping only on success, so a bad build
  can't take the site down.
- **illustrate.mjs `STYLE` prompt tuning** once real 16:9 output is reviewed.
- **Comments:** built but front-end removed; backend dormant. Discussion routed to
  Facebook via Buffer (RSS feed now includes image enclosures). Don't re-enable on-site
  comments without an explicit decision.

## Quick health check after any deploy
```bash
ls _site/index.html && echo "site built"
curl -sI https://artificialatheist.com/ | head -1          # want 200
ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d   # want empty
```

# Comments — droplet setup (delta)

> **⚠️ DORMANT / ARCHIVED — comments are OFF by design.** The on-site comment
> front-end was removed; discussion is routed to Facebook via Buffer. The
> backend code still exists but is not wired into any page. This document
> describes how the system *would* be stood up and is kept for reference only.
> **Do not re-enable on-site comments without an explicit decision** (see the
> "Comments are OFF" note in `CLAUDE.md`).

The comment system reuses the admin service you already have. This adds public
routes (submit / read) that nginx exposes **without** auth and rate-limits, plus
a moderation panel in `/admin/`. Comments are stored in `data/comments/` on the
droplet (git-ignored, survives deploys).

## 1. Get the files + restart the service

```bash
cd /var/www/artificial-atheist
git pull
sudo systemctl restart aa-admin
```

The new `data/` directory is created automatically on first comment. It's in
`.gitignore`, so it won't conflict with pulls or deploys.

Optional: pick a moderation model (defaults to Haiku, which is right). To
override, add to `/etc/aa-admin.env`:

```
AA_MOD_MODEL=claude-haiku-4-5-20251001
```

## 2. nginx — expose the public comment routes (rate-limited, no auth)

The article pages POST to `/api/comments/submit` and GET `/api/comments/get`.
These must be reachable by the public — but rate-limited so a bot can't flood
moderation costs.

**Add the rate-limit zone** at the `http {}` level (in `/etc/nginx/nginx.conf`,
inside the `http {` block, near the top):

```nginx
    limit_req_zone $binary_remote_addr zone=comments:10m rate=6r/m;
```

(6 submissions per minute per IP, with a small burst. Adjust to taste.)

**Then in the site's 443 server block** (`/etc/nginx/sites-available/artificialatheist.com`),
add these two locations alongside `location /` and `/admin/`:

```nginx
    # Public: submit a comment (rate-limited)
    location = /api/comments/submit {
        limit_req zone=comments burst=3 nodelay;
        proxy_pass http://127.0.0.1:4477/api/comments/submit;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Public: read approved comments
    location = /api/comments/get {
        proxy_pass http://127.0.0.1:4477/api/comments/get$is_args$args;
        proxy_set_header Host $host;
    }
```

Note these are **exact-match** (`location =`) so only those two paths are public.
Everything else under `/api/` stays unreachable from outside — the admin/mod
routes are only proxied via the auth-protected `/admin/` block.

> Important: make sure the public `/api/comments/*` locations are NOT covered by
> your `/admin/` auth block. Because they're exact-match locations, nginx routes
> them directly and they bypass `/admin/`. Confirm with the test below.

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Test

```bash
# read endpoint should return JSON, no auth prompt
curl -s https://artificialatheist.com/api/comments/get?slug=existentialism

# submit should accept and hold for review (or post, if AI approves)
curl -s -X POST https://artificialatheist.com/api/comments/submit \
  -H 'Content-Type: application/json' \
  -d '{"slug":"existentialism","author":"Test","body":"A civil test comment.","elapsed":5000}'

# admin/mod routes must NOT be public (should fail without auth)
curl -s -o /dev/null -w "%{http_code}\n" https://artificialatheist.com/api/mod/queue
```

The last one should be 401/404 (blocked), not 200. If it returns 200, your nginx
is proxying all of `/api/` publicly — tighten to the exact-match locations above.

## 4. Use it

- Comments appear on every article automatically (the section is in the post
  template). Visitors submit; the AI moderates.
- **Approve / reject borderline ones** in the dashboard → **Comments** tab.
- Approved comments show on the article within ~30s (the read endpoint is
  cached briefly).

## How moderation behaves

- **Auto-approves**: on-topic comments and civil disagreement, including
  strong religious arguments. Disagreeing with atheism is never grounds for
  rejection.
- **Auto-rejects**: spam, ads, slurs, targeted harassment, threats, doxxing,
  sexual content, gibberish.
- **Holds for review**: genuinely borderline cases.
- **Fail-safe**: if the API key is missing or the call errors, the comment is
  held for review, never auto-published.

Cost is negligible — roughly 1,500 comments per dollar on Haiku.

## Cheap pre-AI gates (already built in)

Before any AI call, these drop obvious junk for free: a honeypot field, a
minimum time-to-submit (3s), length limits, and a link-count cap. Plus the
nginx per-IP rate limit. So bot floods are killed before they cost anything.

## Data & backups

Comments live in `/var/www/artificial-atheist/data/comments/*.json`. They are
**not** in git. If you want them backed up, copy that folder periodically, e.g.:

```bash
tar czf ~/comments-backup-$(date +%F).tgz -C /var/www/artificial-atheist data
```

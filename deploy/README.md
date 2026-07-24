# Deployment: Artificial Atheist + AtheismIQ Shared Domain

This directory contains deployment documentation and configuration for running the Artificial Atheist static site alongside the AtheismIQ Next.js application on a shared domain.

## Architecture

Both the static Eleventy site and the Next.js app are served under the same domain: `https://artificialatheist.com`

- **Static site** (Eleventy): Home page, articles, about, FAQ — all pre-built to `_site/` via `npm run build`
- **Next.js app** (AtheismIQ): Debate chat, quiz, leaderboard, account pages — running as a separate process on `127.0.0.1:8060`

Nginx acts as a reverse proxy, routing requests to the appropriate backend based on URL path.

## Routing Rules

| Path Prefix | Backend | Purpose |
|---|---|---|
| `/chat`, `/age` | Next.js (8060) | Adults-only debate agent + age gate |
| `/signup` | Next.js (8060) | Contact gate (magic-link email) |
| `/quiz` | Next.js (8060) | Atheism IQ quiz |
| `/leaderboard` | Next.js (8060) | Quiz leaderboard |
| `/account` | Next.js (8060) | User account (balance, consent, deletion) |
| `/pricing` | Next.js (8060) | Credit packs / checkout |
| `/review` | Next.js (8060) | Article-review queue (admin-token gated) |
| `/terms`, `/privacy` | Next.js (8060) | Terms / Privacy pages |
| `/api` | Next.js (8060) | API endpoints |
| `/_next` | Next.js (8060) | Next.js assets (CSS, JS, images) |
| `/result` | Next.js (8060) | Quiz result page |
| Everything else | Static files | Served from `_site/` |

> **`/admin` is NOT proxied.** The existing Artificial Atheist admin dashboard
> (`tools/admin`, basic-auth) already owns `/admin/`. The Next.js article-review
> queue lives at **`/review`** to avoid the collision. The nginx config matches
> each prefix with or without a trailing slash, because the app's internal
> redirects use no trailing slash (e.g. `redirect("/signup")`).

## Setup

### Prerequisites

- Nginx installed and running on the droplet (Lab980, 165.22.128.19)
- Eleventy static site built to `/var/www/artificial-atheist/_site/`
- Next.js app running on `127.0.0.1:8060`

### Nginx Configuration

Replace your existing server block for `artificialatheist.com` with the configuration in `nginx-artificialatheist.com.conf`.

Typically this lives in:
- `/etc/nginx/sites-available/artificialatheist.com`
- `/etc/nginx/sites-enabled/artificialatheist.com` (symlink)

After updating, validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Next.js Environment

The Next.js app must be started with:

```bash
NEXT_PUBLIC_SITE_URL=https://artificialatheist.com npm run start
```

This ensures client-side code uses correct absolute URLs and OG tags reflect the canonical domain.

## Migration Note

Previously, the AtheismIQ quiz was hosted at `atheismiq.lab980.com` (separate subdomain). With this routing, it now lives at `https://artificialatheist.com/quiz/` under the main site domain. Update any bookmarks, marketing links, or documentation accordingly.

## Health Checks

To verify both backends are functioning:

1. Static site: `curl https://artificialatheist.com/` — should return HTML
2. Next.js: `curl https://artificialatheist.com/quiz/` — should return HTML with Next.js metadata
3. API: `curl https://artificialatheist.com/api/health` — should return appropriate status from Next.js
4. Assets: `curl https://artificialatheist.com/_next/static/...` — should return CSS/JS (check actual path in browser dev tools)

## Troubleshooting

### 503 Service Unavailable on `/chat/` or `/quiz/`

Next.js app is not running. Start it:

```bash
NEXT_PUBLIC_SITE_URL=https://artificialatheist.com npm run start
```

### WebSocket Timeouts on Debate Chat

Check that the nginx config includes WebSocket upgrade headers in the `/chat/` location block:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### Static Assets Return 404

Ensure the Eleventy build succeeded and `_site/` is populated:

```bash
ls -la /var/www/artificial-atheist/_site/index.html
```

If missing, rebuild locally or via GitHub Actions, then pull on the droplet:

```bash
cd /var/www/artificial-atheist
git pull
npm install
npm run build
```

### Mixed Content (HTTPS → HTTP Proxying)

The nginx config includes `proxy_set_header X-Forwarded-Proto https;` so the Next.js app sees the original HTTPS scheme. If the app generates HTTP links, check that:

1. `NEXT_PUBLIC_SITE_URL=https://...` is set
2. The app uses `req.headers['x-forwarded-proto']` or similar to detect the original scheme

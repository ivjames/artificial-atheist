# Deployment: Artificial Atheist (unified Next.js app)

The whole site is now ONE Next.js 15 application (App Router, React 19, Prisma +
PostgreSQL) that serves everything: the publication (home, articles, topics,
about, faq, search, debate explainer), the AtheismIQ quiz, and the debate-chat +
credits + article-review surfaces. There is no longer a static Eleventy `_site`
root and no path-based split between two backends — that glue is gone.

## Architecture

- **One Next server** on `127.0.0.1:8060`, run as a persistent service
  (pm2 app or systemd unit, both named `artificial-atheist`).
- **nginx** is a thin TLS-terminating reverse proxy: it terminates HTTPS,
  redirects www → non-www, and proxies *all* paths to the Next app. Config:
  `nginx-artificialatheist.com.conf`.
- **PostgreSQL** runs locally on the droplet; the app reads `DATABASE_URL` from
  its `.env`. Quiz/chat/credit/pipeline data lives there.
- Live at `https://artificialatheist.com` (NON-www canonical). Droplet "Lab980",
  165.22.128.19. Webroot / clone: `/var/www/artificial-atheist`.

> The AtheismIQ quiz used to be a separate app at `atheismiq.lab980.com/quiz`
> (later path-proxied under the main domain). It now lives at `/quiz` in this one
> app — update any old bookmarks or marketing links.

## Deploy flow

Repo-root `./deploy.sh` is fired by the droplet webhook on push to `main`
(or run by hand from `/var/www/artificial-atheist`). It:

1. `git fetch` + `git reset --hard origin/main`
2. `npm ci`
3. `npm run db:deploy` — `prisma migrate deploy && prisma db seed` (idempotent;
   never wipes results). **Never run `db:reset` on the droplet.**
4. `npm run build` — `prisma generate && next build`. **Not destructive:** it
   writes to `.next`; the running server keeps serving the previous build until
   restarted, so a failed build leaves the live site untouched.
5. Restart the `artificial-atheist` service (systemd `restart`, else `pm2 reload`).

## Setup

### Prerequisites

- nginx installed and running on the droplet (Lab980, 165.22.128.19).
- Node 20+ and PostgreSQL running locally.
- Repo cloned to `/var/www/artificial-atheist` with a filled-in `.env`.
- The app registered as a service (see below).

### Environment (`.env` in the app dir)

The app + Prisma read the app's `.env`. Required:

```
DATABASE_URL=postgresql://…            # local Postgres
NEXT_PUBLIC_SITE_URL=https://artificialatheist.com
SESSION_SECRET=$(openssl rand -base64 32)
ANTHROPIC_API_KEY=…                    # articles, debate agent, moderation
PORT=8060
CHAT_ENABLED=false                     # stays false until the go-live runbook clears
PAYMENTS_PROVIDER=stripe               # + STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET at launch
```

Optional / launch-time: `MISTRAL_API_KEY` (EU model slot), `SMTP_URL` +
`EMAIL_FROM` (magic-link email), `ADMIN_TOKEN` (`/review/pipeline`),
`GEO_GATE_ENABLED`, `GEO_ALLOWED_COUNTRIES`. See `LAUNCH-BLOCKERS.md`.

### Service (pick one)

**systemd (recommended):**

```bash
sudo cp deploy/artificial-atheist.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now artificial-atheist
sudo systemctl status artificial-atheist    # logs: journalctl -u artificial-atheist -f
```

**pm2:**

```bash
cd /var/www/artificial-atheist
pm2 start deploy/ecosystem.config.js && pm2 save
```

`deploy.sh` restarts whichever it finds (systemd unit first, else `pm2 reload`).

### nginx (thin reverse proxy)

Install the vhost, then validate and reload:

```bash
sudo cp deploy/nginx-artificialatheist.com.conf \
        /etc/nginx/sites-available/artificialatheist.com
sudo ln -sf /etc/nginx/sites-available/artificialatheist.com \
            /etc/nginx/sites-enabled/artificialatheist.com
sudo nginx -t && sudo systemctl reload nginx
```

The vhost proxies everything to `nextjs_backend` (127.0.0.1:8060), passes
`X-Forwarded-Proto`/`Host`, and includes WebSocket upgrade headers. If you still
run the standalone `tools/admin` dashboard (a separate node process, basic-auth),
add a `location /admin { proxy_pass … }` block *above* `location /` so it isn't
swallowed by the app — the Next-side article-review queue lives at `/review`, so
there's no collision.

### Region gate (GDPR sidestep) — GeoIP2

The app declines the chat surface to EU/EEA + UK visitors so no special-category
(religion/belief) conversation data from GDPR-jurisdiction users is collected. It
reads the visitor country ONLY from the `X-Country-Code` header, which nginx
produces via the GeoIP2 module.

Setup lives in **`nginx-geoip2.conf`** (install steps in that file's header):
install `libnginx-mod-http-geoip2` + the MaxMind GeoLite2-Country DB, load the
module, drop the snippet into `/etc/nginx/conf.d/`, then in
`nginx-artificialatheist.com.conf` **change the region-gate line from
`proxy_set_header X-Country-Code "";` to `proxy_set_header X-Country-Code
$geoip2_country_code;`** and reload.

The vhost ships that header set to `""`, which strips any client-supplied
`X-Country-Code` (so a visitor can't spoof `X-Country-Code: US`) and makes the
gate **fail closed** — nobody reaches the chat until GeoIP2 supplies a real
country. Wire GeoIP2 (and confirm the `curl -H` tests below) **before** flipping
`CHAT_ENABLED=true`. See `GO-LIVE-RUNBOOK.md` for the full sequence.

Verify the header is flowing (after setup):

```bash
# Hit the app directly with a spoofed country header:
curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Country-Code: US' http://127.0.0.1:8060/signup   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Country-Code: DE' http://127.0.0.1:8060/signup   # 307 → /unavailable
# Through nginx, GeoIP2 sets the header from your real IP:
curl -sI https://artificialatheist.com/signup | grep -i location   # EU IP → /unavailable
```

## Health checks

After a deploy, confirm the one server is serving each surface:

```bash
curl -sI https://artificialatheist.com/            | head -1   # home → 200
curl -sI https://artificialatheist.com/posts/<slug>/ | head -1 # an article → 200
curl -sI https://artificialatheist.com/quiz/       | head -1   # quiz → 200
curl -s  https://artificialatheist.com/feed.xml    | head -1   # RSS → XML
curl -sI https://www.artificialatheist.com/ | grep -i location # www → 301 to non-www
```

Duplicate-slug guard before any post-touching push (a dup collides in
`generateStaticParams` and fails the build):

```bash
ls src/posts/ | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//' | sort | uniq -d   # must print nothing
```

## Troubleshooting

### 502 / connection refused

The Next service isn't running. Check and restart:

```bash
sudo systemctl status artificial-atheist    # or: pm2 status
sudo systemctl restart artificial-atheist   # or: pm2 reload artificial-atheist
journalctl -u artificial-atheist -f         # tail logs
```

### Build failed on deploy

`next build` is non-destructive, so the old build keeps serving — the site stays
up. Re-run `./deploy.sh` after fixing, or inspect: `npm run build` in the app dir.
Most common cause is a duplicate slug (see the guard above) or a failed Prisma
migration.

### WebSocket timeouts on debate chat

Confirm the `location /` block in the vhost carries the upgrade headers
(`proxy_http_version 1.1;`, `Upgrade $http_upgrade;`, `Connection
$aa_connection_upgrade;`) — they ship in the current config.

### Mixed content (HTTPS → HTTP proxying)

The vhost sets `proxy_set_header X-Forwarded-Proto $scheme;` so the app sees the
original HTTPS scheme. Also confirm `NEXT_PUBLIC_SITE_URL=https://…` is set.

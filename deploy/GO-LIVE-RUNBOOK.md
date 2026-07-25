# Go-live runbook — debate chat on artificialatheist.com

Ordered checklist to take the debate chat from dark to live on the Lab980
droplet. The site is now ONE Next.js app (publication + AtheismIQ quiz + debate
chat + credits + region gate) at `/var/www/artificial-atheist`, running on
`127.0.0.1:8060` behind nginx as a thin reverse proxy.

The switch itself is one env var (`CHAT_ENABLED`), but do **not** flip it until
every step below is done and verified. Work top to bottom.

---

## 0. Preconditions — NOT engineering (do these first)

These gate the launch and are covered in `LAUNCH-BLOCKERS.md`. The runbook cannot
substitute for them.

- [ ] **Terms & Privacy finalized by counsel.** The `/terms` and `/privacy`
      pages are full drafts with `[Counsel: …]` markers — a lawyer must resolve
      every marker (entity, governing law, retention, refund policy, the
      special-category-data basis).
- [ ] **Provider DPAs signed** with each model provider that will serve traffic
      (Anthropic; Mistral if used) — no-training + bounded-retention terms. The
      region gate removes the *EU-transfer* requirement but not the DPA itself.
- [ ] **Launch code merged to `main`.** The droplet's `deploy.sh` pulls `main`,
      so the chat app, region gate, and nginx changes must all be on `main`
      first (one repo now — no second repo to coordinate).

---

## 1. Deploy the app WITH the gate on, but chat still dark

Keep `CHAT_ENABLED=false` for now so nothing is exposed while you wire things up.

```bash
cd /var/www/artificial-atheist

# 1a. Fill the app's .env:
#   DATABASE_URL=postgresql://…     # local Postgres
#   NEXT_PUBLIC_SITE_URL=https://artificialatheist.com
#   PORT=8060
#   CHAT_ENABLED=false            # stays false until step 4
#   SESSION_SECRET=$(openssl rand -base64 32)
#   ANTHROPIC_API_KEY=...         # (+ MISTRAL_API_KEY if using the EU slot)
#   SMTP_URL=smtp://…             # real email, or magic links only hit the log
#   EMAIL_FROM="Artificial Atheist <no-reply@artificialatheist.com>"
#   ADMIN_TOKEN=...               # to reach /review/pipeline
#   PAYMENTS_PROVIDER=stripe      # + STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
#   # Region gate (defaults are safe; on by default when CHAT_ENABLED=true):
#   GEO_GATE_ENABLED=true
#   # (optional) GEO_ALLOWED_COUNTRIES=US   # strict US-only instead of EU blocklist

# 1b. Migrate the DB + build + restart the service
./deploy.sh                   # git reset main, npm ci, npm run db:deploy, npm run build, restart
# first time only, if the service isn't registered yet — pick one:
#   sudo cp deploy/artificial-atheist.service /etc/systemd/system/ && \
#     sudo systemctl daemon-reload && sudo systemctl enable --now artificial-atheist
#   # or: pm2 start deploy/ecosystem.config.js && pm2 save
```

Sanity (chat still dark → 404s, quiz + publication still work):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/            # 200 (home)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/quiz        # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/signup      # 404 (CHAT_ENABLED=false)
```

---

## 2. nginx — thin proxy + GeoIP2 (so the gate has a country to read)

The vhost (`deploy/nginx-artificialatheist.com.conf`) already proxies everything
to the app on 8060, including `/unavailable`. The new piece is GeoIP2, which sets
the `X-Country-Code` header the gate reads. **The gate fails closed**, so this
must work before you enable chat or nobody gets in.

```bash
# 2a. Install the module + MaxMind GeoLite2-Country DB, load the module, and
#     drop in the http-scope snippet — full steps are in the header of:
cat /var/www/artificial-atheist/deploy/nginx-geoip2.conf
sudo cp /var/www/artificial-atheist/deploy/nginx-geoip2.conf /etc/nginx/conf.d/geoip2.conf

# 2b. (Re)install the vhost
sudo cp /var/www/artificial-atheist/deploy/nginx-artificialatheist.com.conf \
        /etc/nginx/sites-available/artificialatheist.com

# 2c. In that vhost's proxy block, change the region-gate line from
#       proxy_set_header X-Country-Code "";          # ships like this: strips
#                                                    # spoofed client headers,
#                                                    # fails the gate closed
#     to
#       proxy_set_header X-Country-Code $geoip2_country_code;

sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. Verify the gate BEFORE enabling chat

Chat is still dark, so test the gate logic by hitting the app directly with a
spoofed header once step 4 flips it; for now confirm the config is valid and the
app is up:

```bash
sudo nginx -t         # must pass with the uncommented $geoip2_country_code line
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/   # 200 (app is up)
```

---

## 4. Flip the switch

```bash
cd /var/www/artificial-atheist
# set CHAT_ENABLED=true in the env, then restart:
sudo systemctl restart artificial-atheist        # or: pm2 restart artificial-atheist
```

Smoke test (through nginx, real GeoIP2):

```bash
# US / non-GDPR visitor → chat reachable
curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Country-Code: US' http://127.0.0.1:8060/signup   # 200
# EU visitor → redirected to /unavailable
curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Country-Code: DE' http://127.0.0.1:8060/signup   # 307
curl -sI http://127.0.0.1:8060/signup -H 'X-Country-Code: DE' | grep -i location                # /unavailable
# No country header → fails closed (blocked)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/signup                            # 307 → /unavailable

# End-to-end through the public domain:
#   - visit https://artificialatheist.com/debate → "Start a debate" → /age → /signup
#   - complete signup, confirm the magic-link email actually arrives (SMTP_URL)
#   - click it, land on /chat, confirm free questions work
#   - buy a pack on /pricing (confirm Stripe, NOT the dev stub, is live)
#   - /account → delete-my-data works
```

Also confirm the publication and quiz are unaffected:
`https://artificialatheist.com/` (home), an article `/posts/<slug>/`, and
`/quiz/` all load.

---

## 5. Rollback (instant)

If anything looks wrong, re-dark the chat — no data collected while off:

```bash
cd /var/www/artificial-atheist
# set CHAT_ENABLED=false, then:
sudo systemctl restart artificial-atheist        # or: pm2 restart artificial-atheist
```

Every chat surface returns to 404; the quiz and publication keep serving. The
region gate and nginx changes are inert while `CHAT_ENABLED=false`.

---

## Notes

- **Rate limiting is per-process/in-memory** (`lib/ratelimit.ts`). Fine for the
  single instance; add Redis before scaling horizontally.
- **Payments stub must never run in prod** — confirm `PAYMENTS_PROVIDER=stripe`
  and both Stripe keys are set, or the app grants credits with no charge.
- **Stripe webhook** must target the trailing-slash form of its API route
  (`next.config.mjs` sets `trailingSlash: true`) — configure that URL at launch.
- **Article pipeline** (`/review/pipeline`, `npm run pipeline:*`) is gated by
  `ADMIN_TOKEN` and is separate from the chat go-live; enable when ready
  (see `PIPELINE.md`).

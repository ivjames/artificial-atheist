# Go-live runbook — debate chat on artificialatheist.com

Ordered checklist to take the debate chat from dark to live on the Lab980
droplet. Two repos are involved: **AtheismIQ** (the Next.js app — chat, credits,
region gate) at `/var/www/atheismiq`, and **artificial-atheist** (static site +
the shared-domain nginx config) at `/var/www/artificial-atheist`.

The switch itself is one env var (`CHAT_ENABLED`), but do **not** flip it until
every step below is done and verified. Work top to bottom.

---

## 0. Preconditions — NOT engineering (do these first)

These gate the launch and are covered in `AtheismIQ/LAUNCH-BLOCKERS.md`. The
runbook cannot substitute for them.

- [ ] **Terms & Privacy finalized by counsel.** The `/terms` and `/privacy`
      pages are full drafts with `[Counsel: …]` markers — a lawyer must resolve
      every marker (entity, governing law, retention, refund policy, the
      special-category-data basis).
- [ ] **Provider DPAs signed** with each model provider that will serve traffic
      (Anthropic; Mistral if used) — no-training + bounded-retention terms. The
      region gate removes the *EU-transfer* requirement but not the DPA itself.
- [ ] **Both branches merged to `main`.** The droplet's `deploy.sh` pulls
      `main`, so the launch code (chat app + region gate in AtheismIQ, nginx
      changes in artificial-atheist) must be on `main` in both repos first.

---

## 1. AtheismIQ app — deploy WITH the gate on, but chat still dark

Keep `CHAT_ENABLED=false` for now so nothing is exposed while you wire things up.

```bash
cd /var/www/atheismiq

# 1a. Fill /etc/… env or the app's .env (see AtheismIQ/.env.example):
#   CHAT_ENABLED=false            # stays false until step 4
#   SESSION_SECRET=$(openssl rand -base64 32)
#   ANTHROPIC_API_KEY=...         # (+ MISTRAL_API_KEY if using the EU slot)
#   SMTP_URL=smtp://…             # real email, or magic links only hit the log
#   EMAIL_FROM="Artificial Atheist <no-reply@artificialatheist.com>"
#   ADMIN_TOKEN=...               # to reach /review/pipeline
#   PAYMENTS_PROVIDER=stripe      # + STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
#   NEXT_PUBLIC_SITE_URL=https://artificialatheist.com
#   PORT=8060
#   # Region gate (defaults are safe; on by default when CHAT_ENABLED=true):
#   GEO_GATE_ENABLED=true
#   # (optional) GEO_ALLOWED_COUNTRIES=US   # strict US-only instead of EU blocklist

# 1b. Migrate the DB (adds chat tables; quiz tables untouched) + build + start
./deploy/deploy.sh            # git pull main, npm ci, prisma migrate deploy, build, restart
# first time only, if not yet registered:
#   pm2 start deploy/ecosystem.config.js && pm2 save
```

Sanity (chat still dark → 404s, quiz still works):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/quiz     # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8060/signup   # 404 (CHAT_ENABLED=false)
```

---

## 2. nginx — routing + GeoIP2 (so the gate has a country to read)

Routing to the app already lives in
`artificial-atheist/deploy/nginx-artificialatheist.com.conf` (it now also
proxies `/unavailable`). The new piece is GeoIP2, which sets the
`X-Country-Code` header the gate reads. **The gate fails closed**, so this must
work before you enable chat or nobody gets in.

```bash
# 2a. Install the module + MaxMind GeoLite2-Country DB, load the module, and
#     drop in the http-scope snippet — full steps are in the header of:
cat /var/www/artificial-atheist/deploy/nginx-geoip2.conf
sudo cp /var/www/artificial-atheist/deploy/nginx-geoip2.conf /etc/nginx/conf.d/geoip2.conf

# 2b. Refresh the vhost (adds /unavailable route)
sudo cp /var/www/artificial-atheist/deploy/nginx-artificialatheist.com.conf \
        /etc/nginx/sites-available/artificialatheist.com

# 2c. Uncomment this line in that vhost's proxy block:
#       proxy_set_header X-Country-Code $geoip2_country_code;

sudo nginx -t && sudo systemctl reload nginx
```

---

## 3. Verify the gate BEFORE enabling chat

Temporarily nothing is reachable yet (chat dark), so test the gate logic by
hitting the app directly with a spoofed header. Both should behave regardless of
`CHAT_ENABLED` once you reach step 4; for now confirm the app is up:

```bash
# Confirm GeoIP2 is resolving your real IP through nginx (returns a country map)
# by checking nginx error log is clean after reload, and the header install.
sudo nginx -t         # must pass with the uncommented header line
```

---

## 4. Flip the switch

```bash
cd /var/www/atheismiq
# set CHAT_ENABLED=true in the env, then restart:
pm2 restart atheismiq        # or: sudo systemctl restart atheismiq
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

Also confirm the static site and quiz are unaffected:
`https://artificialatheist.com/` (home) and `/quiz/` both load.

---

## 5. Rollback (instant)

If anything looks wrong, re-dark the chat — no data collected while off:

```bash
cd /var/www/atheismiq
# set CHAT_ENABLED=false, then:
pm2 restart atheismiq        # or systemctl restart
```

Every chat surface returns to 404; the quiz and static site keep serving. The
region gate and nginx changes are inert while `CHAT_ENABLED=false`.

---

## Notes

- **Rate limiting is per-process/in-memory** (`lib/ratelimit.ts`). Fine for the
  single pm2 instance; add Redis before scaling horizontally.
- **Payments stub must never run in prod** — confirm `PAYMENTS_PROVIDER=stripe`
  and both Stripe keys are set, or the app grants credits with no charge.
- **Article pipeline** (`/review/pipeline`, `npm run pipeline:*`) is gated by
  `ADMIN_TOKEN` and is separate from the chat go-live; enable when ready.

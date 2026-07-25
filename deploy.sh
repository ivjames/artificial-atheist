#!/usr/bin/env bash
# Unified deploy for artificialatheist.com — a single Next.js app that serves
# the publication (static articles from src/posts), the AtheismIQ quiz, and the
# debate/chat surface. Fired by the droplet webhook on push to main, or run by
# hand from the app dir:
#   cd /var/www/artificial-atheist && ./deploy.sh
#
# Assumes on the droplet: repo cloned here, a filled-in .env present (DATABASE_URL,
# NEXT_PUBLIC_SITE_URL=https://artificialatheist.com, SESSION_SECRET, provider
# keys, CHAT_ENABLED, PAYMENTS_PROVIDER, PORT=8060), Postgres running locally,
# and the app registered as a service (pm2 app or systemd unit "artificial-atheist").
set -euo pipefail

cd /var/www/artificial-atheist

BRANCH="${DEPLOY_BRANCH:-main}"
SERVICE="${SERVICE_NAME:-artificial-atheist}"

echo "==> Fetching $BRANCH"
git fetch --quiet origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Installing dependencies (incl. devDeps for prisma/tsx/next build)"
npm ci --no-audit --no-fund

echo "==> Applying DB migrations + idempotent question seed"
npm run db:deploy   # prisma migrate deploy && prisma db seed (never wipes results)

echo "==> Building the Next app"
# Unlike the old Eleventy build, `next build` is NOT destructive: it writes to
# .next and the running server keeps serving the previous build until it's
# restarted below. A failed build therefore leaves the live site untouched.
npm run build

echo "==> Syncing articles (markdown → Article read-model table)"
# Markdown stays the source of truth; this mirrors the published posts into the
# DB so the quiz/chat/API can reference them. Idempotent. Runs here (droplet)
# because the DB is local — the GitHub Actions generator can't reach it.
npm run articles:sync

echo "==> Restarting $SERVICE"
if command -v systemctl >/dev/null && systemctl list-unit-files | grep -q "^${SERVICE}.service"; then
  sudo systemctl restart "$SERVICE"
elif command -v pm2 >/dev/null; then
  pm2 reload "$SERVICE" || pm2 start deploy/ecosystem.config.js
else
  echo "!! No systemd unit or pm2 found — start the app manually (npm run start)." >&2
  exit 1
fi

echo "==> Deployed at $(date)"

#!/bin/bash
set -e
cd /var/www/artificial-atheist
git pull origin main
npm install --no-audit --no-fund
npm run build
# Belt-and-suspenders: the build now writes to a scratch dir and only swaps
# _site into place on success, so a failed build leaves the previous _site
# serving. This guard catches any case where _site is missing/empty anyway.
test -f _site/index.html || { echo "BUILD PRODUCED NO _site/index.html — deploy aborted, previous site still live" >&2; exit 1; }
echo "Deployed at $(date)"

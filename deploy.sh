#!/bin/bash
set -e
cd /var/www/artificial-atheist
git pull origin main
npm install --no-audit --no-fund
npm run build
echo "Deployed at $(date)"

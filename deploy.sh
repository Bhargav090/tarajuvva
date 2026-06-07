#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB_OUT="${WEB_OUT:-/var/www/html}"

echo "==> Pull latest from git"
cd "$REPO_ROOT"
git pull

echo "==> Backend: install + restart"
cd "$REPO_ROOT/backend"
npm install --omit=dev
pm2 delete backend 2>/dev/null || true
pm2 start npm --name backend -- start
pm2 save

echo "==> Frontend: check .env"
cd "$REPO_ROOT/web"
if [[ ! -f .env ]] || ! grep -q '^VITE_API_BASE_URL=' .env || ! grep -q '^VITE_GOOGLE_CLIENT_ID=' .env; then
  echo "ERROR: $REPO_ROOT/web/.env must define VITE_API_BASE_URL and VITE_GOOGLE_CLIENT_ID"
  exit 1
fi

echo "==> Frontend: install, build, deploy"
npm install
npm run build
rm -rf "$WEB_OUT"/*
cp -r dist/* "$WEB_OUT"/

echo "==> Deploy complete"
pm2 status

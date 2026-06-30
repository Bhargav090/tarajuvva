#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
WEB_OUT="${WEB_OUT:-/var/www/html}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/default}"

echo "==> Pull latest from git"
cd "$REPO_ROOT"
git pull

echo "==> Backend: check Razorpay secrets in backend/.env"
cd "$REPO_ROOT/backend"
if [[ ! -f .env ]] || ! grep -qE '^RAZORPAY_KEY_ID=.+' .env || ! grep -qE '^RAZORPAY_KEY_SECRET=.+' .env; then
  echo "ERROR: $REPO_ROOT/backend/.env must define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for online checkout"
  exit 1
fi

echo "==> Backend: install + restart"
npm install --omit=dev
pm2 delete backend 2>/dev/null || true
pm2 start npm --name backend -- start
pm2 save

echo "==> Frontend: check secrets in web/.env"
cd "$REPO_ROOT/web"
if [[ ! -f .env ]] || ! grep -q '^VITE_GOOGLE_CLIENT_ID=' .env; then
  echo "ERROR: $REPO_ROOT/web/.env must define VITE_GOOGLE_CLIENT_ID (server secret, not in git)"
  echo "       VITE_API_BASE_URL is set via web/.env.production → /api"
  exit 1
fi

echo "==> Frontend: install, build, deploy"
npm install
npm run build
sudo mkdir -p "$WEB_OUT"
sudo find "$WEB_OUT" -mindepth 1 -delete
sudo cp -r dist/* "$WEB_OUT"/
sudo chown -R www-data:www-data "$WEB_OUT" 2>/dev/null || sudo chown -R root:root "$WEB_OUT"

if [[ -f "$REPO_ROOT/deploy/nginx/tarajuvva.conf" ]]; then
  echo "==> Nginx: sync site config (www → apex redirect, uploads, api)"
  sudo cp "$REPO_ROOT/deploy/nginx/tarajuvva.conf" "$NGINX_SITE"
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "==> Smoke tests"
curl -sf "http://localhost:4000/api/health" >/dev/null && echo "  backend: ok"
curl -sfI "https://tarajuvva.com" | head -1 || true
curl -sfI "https://www.tarajuvva.com" | head -1 || true

echo "==> Deploy complete"
pm2 status

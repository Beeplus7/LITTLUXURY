#!/usr/bin/env bash
# Deploy LITTLUXRY to IONOS VPS without clashing with other projects.
#
# Isolation:
#   Dir:   /opt/littluxry
#   PM2:   littluxry-web
#   Port:  3020
#   Nginx: sites-available/littluxry (server_name litt-luxury.com www.litt-luxury.com)
#
#   export SSHPASS='…'
#   bash scripts/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VPS="${VPS:-root@87.106.103.43}"
APP_DIR="${APP_DIR:-/opt/littluxry}"
REPO="${REPO:-https://github.com/Beeplus7/LITTLUXURY.git}"
BRANCH="${BRANCH:-main}"
WEB_PORT="${WEB_PORT:-3020}"
PM2_NAME="${PM2_NAME:-littluxry-web}"
DOMAIN="${DOMAIN:-litt-luxury.com}"
DOMAIN_WWW="${DOMAIN_WWW:-www.litt-luxury.com}"
ENV_FILE="${ENV_FILE:-$ROOT/littluxry-app/.env.local}"

ssh_cmd() {
  local opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
  if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null; then
    opts+=(-o PreferredAuthentications=password -o PubkeyAuthentication=no)
    sshpass -e ssh "${opts[@]}" "$@"
  else
    ssh "${opts[@]}" "$@"
  fi
}

scp_cmd() {
  local opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
  if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null; then
    opts+=(-o PreferredAuthentications=password -o PubkeyAuthentication=no)
    sshpass -e scp "${opts[@]}" "$@"
  else
    scp "${opts[@]}" "$@"
  fi
}

echo "==> Deploy LITTLUXRY → $VPS ($APP_DIR · port $WEB_PORT · $DOMAIN / $DOMAIN_WWW)"

ssh_cmd "$VPS" "export APP_DIR='$APP_DIR' REPO='$REPO' BRANCH='$BRANCH'; bash -s" <<'REMOTE'
set -euo pipefail
if [[ ! -d "$APP_DIR/.git" ]]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
mkdir -p "$APP_DIR/littluxry-app"
REMOTE

if [[ -f "$ENV_FILE" ]]; then
  echo "==> Syncing .env.local to VPS (required for Google / Supabase)"
  scp_cmd "$ENV_FILE" "$VPS:$APP_DIR/littluxry-app/.env.local"
else
  echo "WARN: $ENV_FILE missing — Google auth will not work on VPS"
fi

IMPORTS_DIR="$ROOT/littluxry-app/public/assets/imports"
if [[ -d "$IMPORTS_DIR" ]] && compgen -G "$IMPORTS_DIR/*/*.*" > /dev/null; then
  echo "==> Syncing Yupoo/media imports to VPS (gitignored binaries)"
  ssh_cmd "$VPS" "mkdir -p '$APP_DIR/littluxry-app/public/assets/imports'"
  # Prefer rsync if available locally + remotely
  if command -v rsync >/dev/null && [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null; then
    sshpass -e rsync -az --delete \
      -e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=accept-new" \
      "$IMPORTS_DIR/" "$VPS:$APP_DIR/littluxry-app/public/assets/imports/"
  elif command -v rsync >/dev/null; then
    rsync -az --delete -e "ssh -o StrictHostKeyChecking=accept-new" \
      "$IMPORTS_DIR/" "$VPS:$APP_DIR/littluxry-app/public/assets/imports/"
  else
    scp_cmd -r "$IMPORTS_DIR/." "$VPS:$APP_DIR/littluxry-app/public/assets/imports/"
  fi
else
  echo "NOTE: no local imports to sync (run scripts/scrape_yupoo_public.py first)"
fi

ssh_cmd "$VPS" "export APP_DIR='$APP_DIR' WEB_PORT='$WEB_PORT' PM2_NAME='$PM2_NAME' DOMAIN='$DOMAIN' DOMAIN_WWW='$DOMAIN_WWW'; bash -s" <<'REMOTE'
set -euo pipefail

cd "$APP_DIR/littluxry-app"
# Ensure production site URL
if [[ -f .env.local ]]; then
  grep -q '^NEXT_PUBLIC_SITE_URL=' .env.local \
    && sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://litt-luxury.com|' .env.local \
    || echo 'NEXT_PUBLIC_SITE_URL=https://litt-luxury.com' >> .env.local
fi

npm install --omit=dev=false
npm run build

cat > "$APP_DIR/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: '${PM2_NAME}',
    cwd: '${APP_DIR}/littluxry-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p ${WEB_PORT} -H 127.0.0.1',
    env: {
      NODE_ENV: 'production',
      PORT: '${WEB_PORT}',
    },
  }],
}
EOF

pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

# Keep existing SSL nginx if certbot already configured; refresh proxy block carefully
if [[ ! -f /etc/nginx/sites-available/littluxry ]]; then
  cat > /etc/nginx/sites-available/littluxry <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${DOMAIN_WWW};
    client_max_body_size 32m;
    large_client_header_buffers 4 32k;
    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        # Supabase auth Set-Cookie headers are large — avoid 502 "upstream sent too big header"
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_temp_file_write_size 256k;
    }
}
EOF
  ln -sfn /etc/nginx/sites-available/littluxry /etc/nginx/sites-enabled/littluxry
elif ! grep -q 'proxy_buffer_size' /etc/nginx/sites-available/littluxry; then
  # Patch live SSL site once if buffers missing
  python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-available/littluxry')
t = p.read_text()
if 'proxy_buffer_size' not in t:
    t = t.replace(
        'client_max_body_size 32m;',
        'client_max_body_size 32m;\n    large_client_header_buffers 4 32k;',
        1,
    )
    needle = 'proxy_cache_bypass $http_upgrade;'
    bump = '''proxy_cache_bypass $http_upgrade;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_temp_file_write_size 256k;'''
    if needle in t:
        t = t.replace(needle, bump, 1)
    p.write_text(t)
    print('Patched nginx proxy buffers for OAuth cookies')
PY
fi

nginx -t
systemctl reload nginx

# Ensure cert exists (no-op if already issued)
if command -v certbot >/dev/null; then
  certbot --nginx -d "$DOMAIN" -d "$DOMAIN_WWW" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null \
    || echo "SSL already configured or certbot skipped"
fi

echo "==> Health"
sleep 2
curl -s -o /dev/null -w "local:%{http_code}\n" "http://127.0.0.1:${WEB_PORT}/" || true
curl -s -o /dev/null -w "admin:%{http_code}\n" "http://127.0.0.1:${WEB_PORT}/admin/signin" || true
pm2 show "$PM2_NAME" | head -16
echo "DONE littluxry on port ${WEB_PORT} · ${DOMAIN}"
REMOTE

echo "==> Local deploy script finished"

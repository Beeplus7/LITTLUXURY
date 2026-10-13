#!/usr/bin/env bash
# Deploy LITTLUXRY to IONOS VPS without clashing with other projects.
#
# Isolation:
#   Dir:   /opt/littluxry
#   PM2:   littluxry-web
#   Port:  3020
#   Nginx: sites-available/littluxry (server_name littluxry.aroleadjo.com)
#
#   export SSHPASS='…'
#   bash scripts/deploy-vps.sh
set -euo pipefail

VPS="${VPS:-root@87.106.103.43}"
APP_DIR="${APP_DIR:-/opt/littluxry}"
REPO="${REPO:-https://github.com/Beeplus7/LITTLUXURY.git}"
BRANCH="${BRANCH:-main}"
WEB_PORT="${WEB_PORT:-3020}"
PM2_NAME="${PM2_NAME:-littluxry-web}"
DOMAIN="${DOMAIN:-littluxry.aroleadjo.com}"

ssh_cmd() {
  local opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)
  if [[ -n "${SSHPASS:-}" ]] && command -v sshpass >/dev/null; then
    opts+=(-o PreferredAuthentications=password -o PubkeyAuthentication=no)
    sshpass -e ssh "${opts[@]}" "$@"
  else
    ssh "${opts[@]}" "$@"
  fi
}

echo "==> Deploy LITTLUXRY → $VPS ($APP_DIR · port $WEB_PORT · $DOMAIN)"

ssh_cmd "$VPS" "export APP_DIR='$APP_DIR' REPO='$REPO' BRANCH='$BRANCH' WEB_PORT='$WEB_PORT' PM2_NAME='$PM2_NAME' DOMAIN='$DOMAIN'; bash -s" <<'REMOTE'
set -euo pipefail

if [[ ! -d "$APP_DIR/.git" ]]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

cd "$APP_DIR/littluxry-app"
npm ci --omit=dev=false
npm run build

# PM2 ecosystem
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

# Nginx site (do not touch other sites)
cat > "/etc/nginx/sites-available/littluxry" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 32m;

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
    }
}
EOF

ln -sfn /etc/nginx/sites-available/littluxry /etc/nginx/sites-enabled/littluxry
nginx -t
systemctl reload nginx

# SSL if DNS already points here
if command -v certbot >/dev/null; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect 2>/dev/null \
    || echo "SSL skipped (DNS may not point to this VPS yet)"
fi

echo "==> Health"
sleep 2
curl -s -o /dev/null -w "local:%{http_code}\n" "http://127.0.0.1:${WEB_PORT}/" || true
pm2 show "$PM2_NAME" | head -20
echo "DONE littluxry on port ${WEB_PORT} · ${DOMAIN}"
REMOTE

echo "==> Local deploy script finished"

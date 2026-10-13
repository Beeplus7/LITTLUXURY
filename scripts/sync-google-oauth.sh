#!/usr/bin/env bash
# Sync Google OAuth Client ID/Secret from littluxry-app/.env.local → Supabase Auth.
# Also sets Site URL + redirect allow-list for litt-luxury.com.
#
# Prerequisites: `supabase` CLI logged in (or SUPABASE_ACCESS_TOKEN).
# Usage: bash scripts/sync-google-oauth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/littluxry-app/.env.local}"
REF="${SUPABASE_PROJECT_REF:-ungfnedvfrdxhhfgiovn}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source <(grep -E '^(GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET)=' "$ENV_FILE")
set +a

if [[ -z "${GOOGLE_CLIENT_ID:-}" || -z "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  echo "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing in $ENV_FILE" >&2
  exit 1
fi

if [[ ! "$GOOGLE_CLIENT_SECRET" =~ ^GOCSPX- ]]; then
  echo "GOOGLE_CLIENT_SECRET does not look like a Google web client secret (GOCSPX-…)" >&2
  exit 1
fi

echo "==> Probing Google token endpoint (expect invalid_grant, not invalid_client)…"
PROBE=$(curl -sS -X POST https://oauth2.googleapis.com/token \
  -d "code=4/invalid" \
  -d "client_id=${GOOGLE_CLIENT_ID}" \
  -d "client_secret=${GOOGLE_CLIENT_SECRET}" \
  -d "redirect_uri=https://${REF}.supabase.co/auth/v1/callback" \
  -d "grant_type=authorization_code" || true)
if echo "$PROBE" | grep -q 'invalid_client'; then
  echo "FAIL: Google rejected Client ID/Secret (invalid_client)." >&2
  echo "Regenerate the secret in Google Cloud → Credentials → Lift-Luxury → Reset secret," >&2
  echo "paste into .env.local, then re-run this script." >&2
  exit 1
fi
echo "OK: credentials accepted by Google ($PROBE)"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s 'Supabase CLI' -w 2>/dev/null || true)"
fi
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "No SUPABASE_ACCESS_TOKEN / Supabase CLI keychain entry." >&2
  exit 1
fi

echo "==> Patching Supabase Auth config (${REF})…"
curl -sS -X PATCH "https://api.supabase.com/v1/projects/${REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json, os
print(json.dumps({
  "site_url": "https://litt-luxury.com",
  "uri_allow_list": "http://localhost:3000/**,http://localhost:3000/auth/callback,https://litt-luxury.com/**,https://litt-luxury.com/auth/callback,https://www.litt-luxury.com/**,https://www.litt-luxury.com/auth/callback",
  "external_google_enabled": True,
  "external_google_client_id": os.environ["GOOGLE_CLIENT_ID"],
  "external_google_secret": os.environ["GOOGLE_CLIENT_SECRET"],
}))
PY
)" | python3 -c "import sys,json;c=json.load(sys.stdin);print('site_url=',c.get('site_url'));print('google=',c.get('external_google_enabled'));print('client_id=',c.get('external_google_client_id'))"

echo "DONE. Retry Google sign-in on https://litt-luxury.com/signin"

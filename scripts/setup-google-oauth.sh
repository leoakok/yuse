#!/usr/bin/env bash
# One-time Google OAuth + AUTH_SECRET setup for CV Builder local development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REDIRECT_URI="${OAUTH_REDIRECT_URI:-http://localhost:3000/api/auth/callback/google}"
ENV_FILE="${ROOT}/.env"
BACKEND_ENV="${ROOT}/backend/.env"
ENV_EXAMPLE="${ROOT}/.env.example"
BACKEND_ENV_EXAMPLE="${ROOT}/backend/.env.example"

info() { printf '\033[1;34m→\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m✓\033[0m %s\n' "$*"; }

set_env_var() {
  local file="$1" key="$2" value="$3"
  if [[ ! -f "$file" ]]; then
    touch "$file"
  fi
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    echo "${key}=${value}" >>"$file"
  fi
}

get_env_var() {
  local file="$1" key="$2"
  if [[ -f "$file" ]] && grep -q "^${key}=" "$file" 2>/dev/null; then
    grep "^${key}=" "$file" | cut -d= -f2-
  fi
}

if [[ ! -f "$ENV_FILE" ]]; then
  info "Creating ${ENV_FILE} from .env.example"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

if [[ ! -f "$BACKEND_ENV" ]]; then
  info "Creating ${BACKEND_ENV} from backend/.env.example"
  cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
fi

AUTH_SECRET="$(get_env_var "$ENV_FILE" AUTH_SECRET)"
if [[ -z "$AUTH_SECRET" ]]; then
  AUTH_SECRET="$(openssl rand -base64 32)"
  set_env_var "$ENV_FILE" AUTH_SECRET "$AUTH_SECRET"
  ok "Generated AUTH_SECRET"
else
  ok "AUTH_SECRET already set in .env"
fi
set_env_var "$BACKEND_ENV" AUTH_SECRET "$AUTH_SECRET"

CLIENT_ID="$(get_env_var "$ENV_FILE" GOOGLE_CLIENT_ID)"
CLIENT_SECRET="$(get_env_var "$ENV_FILE" GOOGLE_CLIENT_SECRET)"

if [[ -n "$CLIENT_ID" && -n "$CLIENT_SECRET" ]]; then
  ok "Google OAuth credentials already present in .env"
  info "Restart the app: npm run start"
  exit 0
fi

info "Google OAuth credentials are not set yet."
echo ""
echo "Redirect URI (add this in Google Cloud Console):"
echo "  ${REDIRECT_URI}"
echo ""

GCP_PROJECT=""
if command -v gcloud >/dev/null 2>&1; then
  if gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
    GCP_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
    if [[ -z "$GCP_PROJECT" || "$GCP_PROJECT" == "(unset)" ]]; then
      warn "No default gcloud project. Run: gcloud config set project YOUR_PROJECT_ID"
    else
      ok "gcloud project: ${GCP_PROJECT}"
      info "Enabling OAuth-related APIs (best effort)…"
      gcloud services enable iam.googleapis.com --project="$GCP_PROJECT" >/dev/null 2>&1 || true
      CONSOLE_URL="https://console.cloud.google.com/apis/credentials/oauthclient?project=${GCP_PROJECT}"
      info "Open OAuth client creation:"
      echo "  ${CONSOLE_URL}"
      if command -v open >/dev/null 2>&1; then
        open "$CONSOLE_URL" 2>/dev/null || true
      fi
    fi
  else
    warn "gcloud found but not authenticated. Run: gcloud auth login"
  fi
else
  warn "gcloud CLI not installed — use the manual Console link in docs/AUTH.md"
  echo "  https://console.cloud.google.com/apis/credentials"
fi

echo ""
echo "In Google Cloud Console:"
echo "  1. Configure the OAuth consent screen (External, add your email as test user)"
echo "  2. Create OAuth client ID → Web application"
echo "  3. Authorized redirect URI: ${REDIRECT_URI}"
echo "  4. Copy Client ID and Client secret below"
echo ""

if [[ -z "$CLIENT_ID" ]]; then
  read -r -p "GOOGLE_CLIENT_ID: " CLIENT_ID
fi
if [[ -z "$CLIENT_SECRET" ]]; then
  read -r -s -p "GOOGLE_CLIENT_SECRET: " CLIENT_SECRET
  echo ""
fi

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  warn "Credentials not provided. Re-run after creating the OAuth client:"
  echo "  bash scripts/setup-google-oauth.sh"
  exit 1
fi

set_env_var "$ENV_FILE" GOOGLE_CLIENT_ID "$CLIENT_ID"
set_env_var "$ENV_FILE" GOOGLE_CLIENT_SECRET "$CLIENT_SECRET"
ok "Wrote Google OAuth credentials to .env"
ok "AUTH_SECRET synced to backend/.env"
info "Start the stack: npm run start"
info "Sign in at http://localhost:3000/login"

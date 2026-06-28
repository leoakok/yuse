#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

require_env_value() {
  local file="$1"
  local key="$2"
  local label="$3"
  if [[ ! -f "$file" ]]; then
    echo "Missing $file — copy from ${file}.example and set ${label}."
    exit 1
  fi
  local value
  value="$(grep "^${key}=" "$file" | cut -d= -f2- || true)"
  if [[ -z "${value// }" ]]; then
    echo "Set ${key} in ${file} (${label} is required)."
    exit 1
  fi
}

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "Edit .env to set AUTH_SECRET, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET."
fi

if [[ ! -f backend/.env ]]; then
  echo "Creating backend/.env from backend/.env.example..."
  cp backend/.env.example backend/.env
  echo "Edit backend/.env to set OPENAI_API_KEY and AUTH_SECRET (must match frontend)."
fi

require_env_value ".env" "AUTH_SECRET" "AUTH_SECRET"
require_env_value ".env" "GOOGLE_CLIENT_ID" "Google OAuth client ID"
require_env_value ".env" "GOOGLE_CLIENT_SECRET" "Google OAuth client secret"
require_env_value "backend/.env" "AUTH_SECRET" "AUTH_SECRET"
require_env_value "backend/.env" "OPENAI_API_KEY" "OpenAI API key"

# Keep backend AUTH_SECRET in sync when root .env defines it.
if [[ -f .env ]] && grep -q '^AUTH_SECRET=' .env; then
  auth_secret="$(grep '^AUTH_SECRET=' .env | cut -d= -f2-)"
  if [[ -n "$auth_secret" ]]; then
    if grep -q '^AUTH_SECRET=' backend/.env 2>/dev/null; then
      if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s|^AUTH_SECRET=.*|AUTH_SECRET=${auth_secret}|" backend/.env
      else
        sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=${auth_secret}|" backend/.env
      fi
    else
      echo "AUTH_SECRET=${auth_secret}" >> backend/.env
    fi
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop and try again."
  exit 1
fi

echo "Starting Postgres and backend (waiting for health checks)..."
# Load backend/.env only for Compose — do not export PORT into the frontend process.
(
  set -a
  # shellcheck disable=SC1091
  source backend/.env
  set +a
  docker compose up -d --wait --build --remove-orphans
)

echo "Postgres and backend are ready."
echo "  GraphQL:  http://localhost:${BACKEND_PORT:-8080}/graphql"
echo "  Frontend: http://localhost:3000"
echo ""

# Next.js reads PORT; backend/.env must not leak 8080 into the dev server.
exec env PORT=3000 npm run dev

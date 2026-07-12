#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/backend/.env"
PORT="${BACKEND_PORT:-8080}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

CRON_SECRET="$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- || true)"
if [[ -z "${CRON_SECRET// }" ]]; then
  echo "Set CRON_SECRET in backend/.env"
  exit 1
fi

URL="http://localhost:${PORT}/internal/cron/job-automations"
echo "POST ${URL}"

curl -sS -X POST "$URL" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  | (command -v jq >/dev/null && jq . || cat)

echo

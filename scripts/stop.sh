#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required."
  exit 1
fi

echo "Stopping Postgres and backend containers..."
docker compose down --remove-orphans

echo "Stopped. Database volume is preserved."
echo "To remove data as well: docker compose down --volumes"

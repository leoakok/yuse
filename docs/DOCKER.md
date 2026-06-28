# Docker & local orchestration

The stack runs **Postgres** and the **Go GraphQL backend** in Docker. The **Next.js frontend** runs on the host for hot reload.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2.1+ for `--wait`)
- Node.js 20+
- OpenAI API key

## First-time setup

```bash
npm run setup:auth
# Or manually: cp .env.example .env && cp backend/.env.example backend/.env
```

See [docs/AUTH.md](AUTH.md) for Google sign-in and env vars.

## Start everything

```bash
npm run start
```

This will:

1. Build and start Postgres and backend via `docker compose up -d --wait --build`
2. Wait until health checks pass
3. Start the Next.js dev server (`npm run dev`)

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| GraphQL  | http://localhost:8080/graphql |
| Playground | http://localhost:8080/playground |
| Postgres | `localhost:5432` |

## Stop

```bash
npm run stop
```

Stops containers and preserves the `postgres_data` volume. To wipe the database:

```bash
docker compose down --volumes
```

## Useful commands

```bash
docker compose logs -f backend    # backend logs
docker compose ps                 # service status
docker compose config             # validate compose file
```

## Layout

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + backend services |
| `backend/Dockerfile` | Multi-stage Go build |
| `scripts/start.sh` | Compose up + Next.js dev |
| `scripts/stop.sh` | Compose down |

## Notes

- All CV data is persisted in Postgres; migrations seed system CV themes only on backend startup.
- Run frontend only: `npm run dev` (backend/Postgres must already be up).
- Production frontend build: `npm run build && npm run start:frontend`.

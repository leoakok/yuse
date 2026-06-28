# CV Builder — Go GraphQL API

OpenAI-powered backend for CV library management and assistant-driven edits.

## Stack

- Go + [gqlgen](https://github.com/99designs/gqlgen) GraphQL
- PostgreSQL persistence (system CV themes seeded on first migration)
- OpenAI API (`gpt-4o-mini` default, `gpt-4o` fallback)
- Auth.js JWT validation (Google sign-in via Next.js proxy)

## Setup

```bash
cd backend
cp .env.example .env
# Set AUTH_SECRET, DATABASE_URL, and OPENAI_API_KEY
make run
```

Requires a running Postgres instance. Migrations run automatically on server start.

- GraphQL: http://localhost:8080/graphql
- Playground: http://localhost:8080/playground
- Health: http://localhost:8080/healthz

## Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | Postgres connection string |
| `AUTH_SECRET` | Yes | — | HS256 secret (must match frontend) |
| `OPENAI_API_KEY` | For assistant | — | OpenAI key; assistant returns an error if missing |
| `OPENAI_MINI_MODEL` | No | `gpt-4o` | Primary agent model |
| `OPENAI_FALLBACK_MODEL` | No | `gpt-4o-mini` | Retry model if primary returns empty |
| `PORT` | No | `8080` | HTTP port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Frontend origin |
| `GITHUB_TOKEN` | No | — | Fallback GitHub API token when user has not connected OAuth |
| `GITHUB_CLIENT_ID` | For Connections | — | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | For Connections | — | GitHub OAuth app client secret |
| `GITHUB_OAUTH_CALLBACK_URL` | No | `{CORS_ORIGIN}/api/auth/github/callback` | OAuth redirect URI registered with GitHub |

## Frontend wiring

```bash
# project root
cp .env.example .env
npm run start
```

The frontend calls `/api/graphql`, which proxies to the Go API with a signed JWT.

## Example queries

```graphql
query {
  me { displayName }
  myWorkspace { name }
  resumes { id title updatedAt }
}
```

## Example mutation

```graphql
mutation {
  sendAssistantMessage(
    text: "Update my skills to include Rust and Kubernetes"
    context: { view: RESUME_DETAIL, resumeId: "<your-resume-id>" }
  ) {
    messages { role content }
    affectedResumeIds
    actionLogs { op success }
  }
}
```

## LLM agent (tool calling)

The assistant uses OpenAI function calling with an in-process MCP tool registry (`internal/mcp`). The agent loop:

1. Model receives system prompt + twin context + user message
2. Model may call tools (`add_section_item`, `get_resume_content`, etc.)
3. Tools execute via `cv.Service` → `store.Store`
4. Tool results are returned to the model until it produces a final reply

Without `OPENAI_API_KEY`, `sendAssistantMessage` returns an error.

See [internal/mcp/README.md](internal/mcp/README.md) for the standalone stdio MCP server and Cursor configuration.

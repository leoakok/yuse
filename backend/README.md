# CV Builder, Go GraphQL API

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
| `DATABASE_URL` | Yes |, | Postgres connection string |
| `AUTH_SECRET` | Yes |, | HS256 secret (must match frontend) |
| `OPENAI_API_KEY` | For assistant |, | OpenAI key; assistant returns an error if missing |
| `OPENAI_MINI_MODEL` | No | `gpt-4o` | Primary agent model |
| `OPENAI_FALLBACK_MODEL` | No | `gpt-4o-mini` | Retry model if primary returns empty |
| `PORT` | No | `8080` | HTTP port |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Frontend origin |
| `GITHUB_TOKEN` | No |, | Fallback GitHub API token when user has not connected OAuth |
| `GITHUB_CLIENT_ID` | For Connections |, | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | For Connections |, | GitHub OAuth app client secret |
| `GITHUB_OAUTH_CALLBACK_URL` | No | `{CORS_ORIGIN}/api/auth/github/callback` | OAuth redirect URI registered with GitHub |
| `EMAIL_PROVIDER` | No | | Set to `resend` to send waitlist and verification email |
| `EMAIL_FROM` | For email | | Sender address verified in Resend |
| `RESEND_API_KEY` | For email | | Resend API key (or use `EMAIL_API_KEY`) |
| `EMAIL_VERIFICATION_REQUIRED` | No | `false` | Require verified email for assistant (auto on when email is configured) |

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

## Production migrations (auto-run on backend start)

Migrations apply in order on server boot. Before launch, ensure these are applied on production Postgres:

| Migration | Purpose |
|-----------|---------|
| `000034_email_verification` | Email verification columns on `users` |
| `000035_beta_access` | Waitlist, `is_active`, admin audit log |
| `000036_resume_sharing` | Public resume `slug` column and unique index per owner |

Security-related env (see `docs/SECURITY.md`): set `TRUSTED_PROXY=true` behind Vercel, configure rate limits, and `BETA_INVITE_ONLY` / `ADMIN_EMAILS` for beta gating.

## Admin bootstrap

Set `ADMIN_EMAILS` (comma-separated) so listed addresses receive the `ADMIN` role on email/password registration and OAuth bootstrap. Users already marked `ADMIN` in the database keep that role. Admins can promote others via GraphQL `setUserRole` in `/admin`.

## Transactional email

Branded HTML templates live in `internal/email/templates/`. Configure Resend:

| Variable | Purpose |
|----------|---------|
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_FROM` | Verified sender in Resend |
| `RESEND_API_KEY` | Resend API key |

Emails: welcome (signup), waitlist approval, email verification, password reset.

Password reset: `POST /auth/forgot-password`, `POST /auth/reset-password`. Frontend pages: `/forgot-password`, `/reset-password?token=…`.

## Migrations (recent)

| Migration | Purpose |
|-----------|---------|
| `000037_password_reset` | Password reset token columns on `users` |

# Security audit and hardening

Last updated: 2026-07-23

## Summary

This document records the security audit for Yuse (Next.js + Go GraphQL) and what was fixed in code versus deferred to infrastructure.

**Current security score: 8.0 / 10** (post-hardening 2026-07-23; see `sast/final-report.md`)

| Category | Score | Notes |
|----------|-------|-------|
| Authentication and session | 8.5 | JWT validation, bootstrap gate, invalid bearer returns 401 |
| Authorization / IDOR | 8.0 | Workspace scope solid; design share owner checks |
| SSRF / RCE | 8.5 | Pinned dialer, no exec/eval sinks |
| GraphQL security | 7.5 | Prod introspection off; FixedComplexityLimit(300) added |
| Rate limiting | 7.5 | Backend public endpoint limits added; frontend TRUSTED_PROXY gate |
| AI / prompt injection | 7.5 | Untrusted-read guard wired in agent_loop |
| Data privacy | 7.5 | REAL design share contact sanitization; UI warning |
| Frontend XSS / CSP | 7.5 | CV contact-header sanitizeExternalUrl; HSTS and object-src |
| Secret management | 8.5 | Env-driven; no hardcoded credentials |
| Infrastructure / ops | 7.5 | MCP dev gate, cron constant-time compare, CI workflow |

## SAST scan summary (2026-07-23)

Full 13-category SAST scan using [utkusen/sast-skills](https://github.com/utkusen/sast-skills). Results in `sast/*-results.md`, consolidated in `sast/final-report.md`.

### Fixes implemented (2026-07-23)

1. Wired `shouldBlockHighImpactToolAfterUntrustedReads` in `agent_loop.go`
2. Backend rate limits on `/public/*`, `/invites/*`, `/auth/verify-email`
3. REAL design share uses `sanitizePublicContact()` plus UI warning
4. gqlgen `FixedComplexityLimit(300)`
5. Frontend `TRUSTED_PROXY` gate for rate-limit client IP
6. `sanitizeExternalUrl()` in CV contact-header
7. Server-side attachment MIME allowlist, magic-byte checks, extractedText cap
8. `/api/public` added to auth public routes
9. MCP stdio `MCP_DEV_ONLY` gate; cron `subtle.ConstantTimeCompare`
10. HSTS header, CSP `object-src 'none'`, GitHub Actions security workflow
11. `deactivateDesignShare` mutation; public design JSON omits `resumeId`

### Still deferred

1. Distributed rate limiting (Redis/Upstash/Cloudflare)
2. Nonce-based CSP (remove unsafe-inline/unsafe-eval)
3. Profile photo magic-byte validation at S3 HeadObject
4. Username-only auto-publish explicit toggle

## Pentest follow-up (agent 920271e4, medium findings)

| Finding | Mitigation |
|---------|------------|
| Email change without password re-auth | `changeEmail` now requires `currentPassword` (same pattern as `changePassword`); settings UI prompts for password confirmation; verification email resent when configured |
| Rate-limit bypass via spoofed `X-Forwarded-For` | `ClientIP` ignores forwarded headers unless `TRUSTED_PROXY=true` or `RemoteAddr` is in `TRUSTED_PROXY_CIDRS`; defaults to `RemoteAddr` |
| Waitlist/account probing via `POST /auth/access-check` | Public endpoint uses `PublicAccessCheckStatus`: detailed waitlist status only for emails on the waitlist; unknown and rejected emails both return `denied`; stricter dedicated rate limit (`RATE_LIMIT_ACCESS_CHECK_*`); Google OAuth blocks only `pending` at sign-in, invite enforcement remains in `EnsureSession` |

### Beta UX tradeoffs

- **Google sign-in without waitlist approval** no longer fails immediately at the OAuth callback. Users who are not approved reach workspace bootstrap, then are signed out with the invite-only login message. Slightly later feedback, but avoids leaking account existence via the access-check endpoint.
- **Waitlist `pending` status** is still visible to anyone who knows an email is on the waitlist (needed for the waitlist-pending login message). Mitigated by the tighter access-check rate limit.
- **Production behind a reverse proxy** must set `TRUSTED_PROXY=true` or `TRUSTED_PROXY_CIDRS` so rate limits use real client IPs instead of the proxy address.

## Critical findings (fixed)

| Issue | Fix |
|-------|-----|
| Invalid/expired JWT treated as anonymous GraphQL user | `WrapGraphQL` now returns 401 when a bearer token is present but invalid |
| Unauthenticated GraphQL mutations could nil-pointer panic | `AroundOperations` middleware requires auth except `publicPortfolioWithContent` |
| No HTTP rate limits | In-memory per-IP limits on login, register, GraphQL; per-user limits on assistant |
| OpenAI/assistant abuse | Per-user assistant rate limits; email verification gate when configured |
| Public portfolio data leak | Hidden projects/skills/testimonials filtered; email/phone stripped from public contact |
| XSS via user-controlled `href` | `sanitizeExternalUrl()` on public portfolio and job links |
| Print cache PII after logout | `clearPrintCache()` on session invalidation |
| Registration email enumeration | Generic conflict message |
| Tracked job URL SSRF vector | Backend + frontend URL validation (http/https only, block private IPs) |
| Unbounded request bodies | Body size limits on auth, GraphQL, assistant routes |
| GraphQL playground in production | Disabled unless `ENABLE_GRAPHQL_PLAYGROUND=true` |

## High findings (partially fixed / deferred)

| Issue | Status |
|-------|--------|
| OAuth tokens stored plaintext in Postgres | **Fixed**: AES-256-GCM at rest via `ENCRYPTION_KEY` or `AUTH_SECRET`; legacy plaintext tokens still decrypt on read |
| Distributed rate limiting across instances | **Deferred**: use Redis, Upstash, or Cloudflare rate rules |
| Full email verification send flow | **Fixed**: Resend transport, verify endpoint, resend mutation |
| MCP stdio server unauthenticated | **Mitigated**: requires `MCP_DEV_ONLY=true` and blocks production-looking `DATABASE_URL` |
| File upload content sniffing | **Partial**: assistant attachments MIME and magic-byte checks; profile photos still Content-Type only |
| GraphQL query depth/complexity limits | **Fixed**: `FixedComplexityLimit(300)` |
| GraphQL introspection in production | **Fixed**: blocked for unauthenticated requests on Vercel/production |
| Encrypt GitHub `repo` scope narrowing | **Deferred**: review minimum scopes |

## Environment variables

### Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENABLE_GRAPHQL_PLAYGROUND` | `false` | Enable `/playground` |
| `EMAIL_PROVIDER` | | `resend` | Outbound email transport |
| `EMAIL_FROM` | | | Sender address (must be verified in Resend) |
| `RESEND_API_KEY` | | | Resend API key (falls back to `EMAIL_API_KEY`) |
| `EMAIL_VERIFICATION_REQUIRED` | `false` | | Block assistant for unverified email users |
| `ADMIN_EMAILS` | (none) | Comma-separated emails granted `ADMIN` on registration and OAuth bootstrap; required for env-based admin access |
| `BETA_INVITE_ONLY` | `false` | When true, new signups require approved waitlist entry |
| `ENCRYPTION_KEY` | | Optional 32-byte AES key for OAuth token encryption; falls back to `AUTH_SECRET` |
| `LINKEDIN_SESSION_COOKIE` | | Admin-only LinkedIn job search (`li_at=...; JSESSIONID="ajax:..."` from DevTools) |
| `RATE_LIMIT_WAITLIST_PER_IP` | `10` | Waitlist submissions per IP per window |
| `RATE_LIMIT_WAITLIST_WINDOW` | `1h` | Waitlist window |
| `RATE_LIMIT_ACCESS_CHECK_PER_IP` | `5` | Access-check probes per IP per window |
| `RATE_LIMIT_ACCESS_CHECK_WINDOW` | `15m` | Access-check window |
| `TRUSTED_PROXY` | `false` | Trust `X-Forwarded-For` / `X-Real-IP` from any upstream (use only when the app is not directly exposed) |
| `TRUSTED_PROXY_CIDRS` | | Comma-separated CIDRs; forwarded headers trusted only when `RemoteAddr` matches |
| `RATE_LIMIT_LOGIN_PER_IP` | `10` | Login attempts per IP per window |
| `RATE_LIMIT_LOGIN_WINDOW` | `15m` | Login window |
| `RATE_LIMIT_REGISTER_PER_IP` | `5` | Registrations per IP per window |
| `RATE_LIMIT_REGISTER_WINDOW` | `1h` | Registration window |
| `RATE_LIMIT_GRAPHQL_PER_IP` | `120` | GraphQL requests per IP per window |
| `RATE_LIMIT_GRAPHQL_WINDOW` | `1m` | GraphQL window |
| `RATE_LIMIT_ASSISTANT_PER_USER` | `20` | Assistant messages per user per window |
| `RATE_LIMIT_ASSISTANT_WINDOW` | `1m` | Assistant window |

### Frontend

Rate limits on `/api/register`, `/api/waitlist`, `/api/graphql`, and `/api/assistant/stream` mirror backend defaults using in-memory buckets (single-instance). Use Cloudflare or Redis for multi-instance production.

## Beta invite-only access

1. Visitors submit email on the homepage waitlist (`POST /api/waitlist` → backend `POST /waitlist`).
2. Admins approve or reject entries in `/admin` (GraphQL `approveWaitlistEntry` / `rejectWaitlistEntry`).
3. When `BETA_INVITE_ONLY=true`, new email/password registration and first-time Google sign-in require an approved waitlist row (or `ADMIN_EMAILS` entry). Existing user rows are grandfathered.
4. All admin mutations verify `role=ADMIN` server-side and append to `admin_audit_log`.
5. Deactivated users (`is_active=false`) cannot authenticate or refresh sessions.
6. Waitlist approval is never self-service. The public waitlist endpoint always returns a generic success message.

## Deployment recommendations

1. **Cloudflare** (or similar CDN/WAF): DDoS protection, bot management, rate rules on `/api/*`, geo blocking if needed.
2. **Secrets**: `AUTH_SECRET`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_SECRET` only on server; never `NEXT_PUBLIC_*`.
3. **Postgres**: TLS in transit, encrypted volumes at rest, least-privilege DB user.
4. **OAuth tokens**: Encrypted at rest with AES-256-GCM (`internal/crypto`, `user_connections` read/write). Set `ENCRYPTION_KEY` or rely on `AUTH_SECRET`. Existing plaintext rows remain readable until rewritten on reconnect.
5. **Observability**: Log 401/429 spikes, assistant usage per user, failed logins per IP.
6. **CSP**: Tighten `script-src` when Vercel Analytics allows nonce-based loading.

## Tests added

- `backend/internal/ratelimit/limiter_test.go`
- `backend/internal/security/urlvalidate_test.go`
- `backend/internal/httpapi/security_test.go`
- `backend/internal/store/beta_access_test.go` (includes `PublicAccessCheckStatus`)
- `backend/internal/store/account_settings_test.go` (email change password gate)
- `src/lib/security/safe-url.test.ts`

Run:

```bash
cd backend && go test ./internal/httpapi/... ./internal/scope/... ./internal/ratelimit/... ./internal/security/... ./internal/auth/... ./internal/store/...
npm test -- src/lib/security/safe-url.test.ts
```

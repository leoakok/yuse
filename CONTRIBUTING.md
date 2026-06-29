# Contributing to Yuse

Thank you for your interest in contributing. This guide covers the basics for getting a change merged.

## Before you start

- Search [existing issues](https://github.com/leoakok/yuse/issues) to avoid duplicate work.
- For large features, open an issue first so we can align on scope.
- Keep pull requests focused — one logical change per PR when possible.

## Development setup

1. Fork and clone the repository.
2. Follow the [README quick start](README.md#quick-start) to run the full stack locally.
3. Read the supporting docs:
   - [docs/AUTH.md](docs/AUTH.md) — Google OAuth, email sign-in, JWT flow
   - [docs/DOCKER.md](docs/DOCKER.md) — Docker Compose, ports, troubleshooting

## Branch and commit workflow

1. Create a branch from `main`:

   ```bash
   git checkout -b feat/short-description
   ```

2. Make your changes and verify locally:

   ```bash
   npm run start    # full stack (Docker + Next.js dev)
   npm run lint     # frontend lint
   cd backend && make test   # Go tests
   ```

3. Push to your fork and open a pull request against `main`.

## Code style

### Frontend (`src/`)

- **Pages** (`src/app/**/page.tsx`) — thin composition only; no large inline JSX or business logic.
- **UI primitives** live in `src/components/ui/` (shadcn only — no feature logic).
- **Feature components** live in domain folders: `src/components/cv/`, `src/components/agent/`, `src/components/layout/`, etc.
- **Data access** goes through `src/lib/api/cv-api.ts`, not direct store imports from pages.
- **User-facing copy** — plain, non-technical language.
- One primary export per file; `PascalCase` filename matching the export.

See [.cursor/rules/components-design-system.mdc](.cursor/rules/components-design-system.mdc) for the full component conventions.

### Backend (`backend/`)

- GraphQL schema in `backend/graph/schema.graphql`; regenerate with `make generate` after schema changes.
- Business logic in `internal/` packages; tools exposed via `internal/mcp`.
- Run `make test` before submitting backend changes.

## Pull request checklist

- [ ] Changes match an issue or are clearly described in the PR body
- [ ] Local dev stack starts without errors (`npm run start`)
- [ ] Lint passes (`npm run lint`) and Go tests pass (`cd backend && make test`) when relevant
- [ ] No secrets, API keys, or `.env` files committed
- [ ] User-facing text is clear and accessible

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS and whether you used Docker or manual setup
- Relevant logs (redact tokens and personal data)

## Feature requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml). Describe the problem, the proposed solution, and alternatives you considered.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

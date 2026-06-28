# CV Builder Roadmap

## Vision

AI-native CV generator built from a **library of reusable content**. Three independent entities:

- **Resume** — a named CV document (e.g. "Senior SWE", "Startup PM")
- **Section** — a typed bucket (Experience, Education, Skills, …)
- **SectionItem** — one atomic entry (one job, one degree, one skill line)

The same item can appear on many resumes via junction links. One **floating CV assistant** edits everything through conversation.

## Hosting

| Layer | Platform |
|-------|----------|
| Frontend | Vercel (Next.js 16) |
| Backend | Go GraphQL + OpenAI |
| Auth (Phase 2) | Auth.js (Google) + JWT to Go API |

---

## Phase 1 — Foundation (current)

**Done**
- Full domain types (`user`, `cv`, `assistant`, `theme`, `sharing`, `tag`)
- Library pages: `/resumes`, `/sections`, `/items` (+ detail routes)
- Resume workspace with live `CvPreview` from `resumeWithContent`
- Global floating `CvAssistantPanel` (single workspace thread)
- Go GraphQL API with Postgres persistence
- Frontend `src/lib/api/cv-api.ts` — GraphQL via `/api/graphql` proxy
- Auth.js Google sign-in with JWT to Go API

**Routes**
- `/` → last-open resume or `/resumes`
- `/resumes/[id]` — main editor + preview
- `/sections`, `/sections/[id]`, `/items`, `/items/[id]`

---

## Phase 2 — Auth & persistence

- Auth.js Google sign-in → per-user `User` + `Workspace` in Postgres
- Postgres with workspace-scoped tables (see plan ER sketch)

---

## Phase 3 — Assistant & CRUD parity

- Full GraphQL mutations for section/item CRUD and link reordering
- OpenAI action applier for all ops (`link_item_to_section`, `create_section`, …)
- Undo via `AssistantActionLog`
- Tags and library filtering

---

## Phase 4 — Sharing & export

- `ShareLink` → `/share/[token]` read-only preview
- `ExportJob` → async PDF generation
- Duplicate resume (shared sections/items by default)

---

## Component architecture

```
src/components/ui/       → shadcn primitives only
src/components/cv/       → preview, grids, lists, workspace
src/components/agent/    → floating assistant, progress UI
src/components/layout/   → app shell, nav, catalog shell
src/lib/types/           → domain types (GraphQL-aligned)
src/lib/api/             → cv-api (GraphQL)
src/lib/graphql/         → client + operations
```

Pages compose domain components only — no large inline UI or business logic.

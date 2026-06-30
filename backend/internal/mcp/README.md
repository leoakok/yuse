# CV Builder MCP Server

MCP (Model Context Protocol) tools for the CV Builder platform. The same tool registry powers:

1. **In-process AI assistant**, OpenAI tool-calling loop in `backend/internal/llm`
2. **Standalone stdio MCP server**, for Cursor and other MCP clients

## Schema design (anti-smell)

Tool descriptions follow practices from [*MCP Tool Descriptions Are Smelly!*](https://arxiv.org/html/2602.14878v1) (arXiv:2602.14878), extended with per-section field specs:

| Principle | How we apply it |
|-----------|-----------------|
| **Concise tool description** | What/when/when-not at tool level; per-section rules in `add_section_item` with GOOD/BAD examples. |
| **Schema as specification** | Enums, typed fields, `required`/`recommended` per section in `section_schema.go`, `examples` on parameters. |
| **Opaque parameters → explicit fields** | `company`, `institution`, `startDate`, `endDate`, `location`, `url`, `level`, `endDatePresent`, not a vague `metadata` bag. |
| **Post-write fieldHints** | Writes return `fieldHints` when structured fields are missing or body contains metadata. Agent loop nudges fixes. |
| **get_resume_content fieldGuide** | Structured object per section: `required`, `recommended`, `fields`, `goodExample`, `badExample`, `notes`. |
| **Validation + normalization** | `normalizeSectionItemArgs` splits `headline at Company`, extracts dates from body; `validateSectionItemInput` rejects metadata dumps. |
| **Disambiguate similar tools** | `explore_website` vs `fetch_url`; `fetch_linkedin_profile` for /in/ URLs; `update_contact_profile` ≠ section items. |
| **Backward compatibility** | `metadata` object still accepted; flat fields merge into it at execution. |

Avoid duplicating schema detail in system prompts, `ToolCatalog()`, JSON Schema, and `fieldGuide` are the source of truth.

## Per-section field conventions

| Section | Required | Body contains |
|---------|----------|---------------|
| EXPERIENCE | headline, company, startDate | Achievement bullets ONLY |
| EDUCATION | headline, institution | Honors/coursework optional |
| SKILLS | headline, level | Optional notes, one skill per item |
| LANGUAGES | headline, level | Optional notes, one language per item |
| PROJECTS | headline | Description/impact, url in `url` field |
| SUMMARY | body | Summary paragraph |

See `section_schema.go` for full specs and examples.

## Architecture

```
Cursor / OpenAI agent
        │
        ├─► cmd/mcp-server (stdio MCP) ──┐
        │                               │
        └─► sendAssistantMessage ───────┼─► mcp.Registry.Execute()
                                        │           │
                                        │           ▼
                                        │    cv.Service (Executor)
                                        │           │
                                        │           ▼
                                        └──    store.Store (Postgres)
```

Tools map 1:1 to GraphQL mutations/queries. No duplicate business logic.

## Tools (29)

| Tool | Description |
|------|-------------|
| `list_resumes` | List all resumes |
| `get_resume` | Resume metadata by id |
| `create_resume` | Create empty resume |
| `duplicate_resume` | Clone resume |
| `delete_resume` | Delete resume |
| `update_resume` | Update title |
| `get_resume_content` | Full resume with structured fieldGuide per section |
| `update_contact_profile` | Edit profile header (not section items) |
| `list_sections` | List sections (optional type filter) |
| `add_section_item` | Add item, per-section schema with validation |
| `update_section_item` | Edit section item, returns fieldHints |
| `set_item_visibility` | Show/hide item in preview |
| `update_resume_settings` | Page format, theme, font size |
| `list_cv_themes` | Available themes |
| `list_twin_entries` | Digital Twin entries |
| `get_twin_entry` | Single twin entry |
| `create_twin_entry` | New twin entry, STAR/PAR fields |
| `update_twin_entry` | Edit twin entry, returns fieldHints |
| `delete_twin_entry` | Delete twin entry |
| `list_tracked_jobs` | Job tracker applications |
| `get_tracked_job` | Single tracked job |
| `update_tracked_job` | Update tracked job |
| `web_search` | DuckDuckGo search |
| `fetch_url` | Fetch one web page |
| `explore_website` | Primary web import (auto strategy) |
| `crawl_site` | Lower-level portfolio crawl |
| `crawl_github_profile` | Lower-level GitHub crawl |
| `search_github` | List/search GitHub repos |
| `fetch_linkedin_profile` | Primary LinkedIn /in/ import |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `OPENAI_API_KEY` | For in-app assistant | Required for `sendAssistantMessage`; not required for the stdio MCP server itself |

## Run standalone MCP server

```bash
cd backend
go build -o bin/cv-mcp ./cmd/mcp-server
DATABASE_URL=postgres://cvbuilder:cvbuilder@localhost:5432/cvbuilder?sslmode=disable \
  ./bin/cv-mcp
```

## Connect from Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "cv-builder": {
      "command": "/Users/leo/Developer/ai-weekend/backend/bin/cv-mcp",
      "env": {
        "DATABASE_URL": "postgres://cvbuilder:cvbuilder@localhost:5432/cvbuilder?sslmode=disable"
      }
    }
  }
}
```

Build the binary first:

```bash
cd backend && go build -o bin/cv-mcp ./cmd/mcp-server
```

Restart Cursor after saving the config. The MCP server speaks JSON-RPC over stdio.

## In-app assistant (GraphQL)

The embedded assistant uses the same registry via OpenAI function calling:

1. User sends `sendAssistantMessage` mutation
2. `llm.Service.RunAgent` loops: model → tool call → `Registry.Execute` → tool result → model
3. Tool executions are logged as `AssistantActionLog` entries
4. When writes return `fieldHints`, agent loop nudges structured field fixes before replying
5. Requires `OPENAI_API_KEY`; returns an error if missing

Twin context is injected into the system prompt; tools handle all mutations.

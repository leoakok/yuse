CREATE TABLE tracked_jobs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'SAVED',
    notes TEXT NOT NULL DEFAULT '',
    resume_id TEXT REFERENCES resumes (id) ON DELETE SET NULL,
    cover_letter TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_tracked_jobs_workspace ON tracked_jobs (workspace_id, updated_at DESC);

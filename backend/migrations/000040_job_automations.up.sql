CREATE TABLE IF NOT EXISTS job_automations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    keywords TEXT,
    geo_id TEXT,
    geo_label TEXT,
    time_filter TEXT NOT NULL DEFAULT 'r86400',
    workplace_types TEXT[] NOT NULL DEFAULT '{}',
    experience_levels TEXT[] NOT NULL DEFAULT '{}',
    employment_types TEXT[] NOT NULL DEFAULT '{}',
    easy_apply BOOLEAN NOT NULL DEFAULT FALSE,
    sort_by TEXT NOT NULL DEFAULT 'DATE_DESC',
    max_results INT NOT NULL DEFAULT 100,
    match_criteria TEXT NOT NULL,
    interval_minutes INT NOT NULL DEFAULT 60,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    notify_email TEXT NOT NULL,
    session_invalid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_seen_jobs (
    automation_id TEXT NOT NULL REFERENCES job_automations (id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (automation_id, job_id)
);

CREATE TABLE IF NOT EXISTS automation_runs (
    id TEXT PRIMARY KEY,
    automation_id TEXT NOT NULL REFERENCES job_automations (id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    jobs_fetched INT NOT NULL DEFAULT 0,
    jobs_matched INT NOT NULL DEFAULT 0,
    jobs_emailed INT NOT NULL DEFAULT 0,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_automations_user_id ON job_automations (user_id);
CREATE INDEX IF NOT EXISTS idx_job_automations_due ON job_automations (enabled, next_run_at)
    WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation_runs (automation_id, started_at DESC);

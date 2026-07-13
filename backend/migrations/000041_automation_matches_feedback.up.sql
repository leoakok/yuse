CREATE TABLE IF NOT EXISTS automation_matched_jobs (
    id TEXT PRIMARY KEY,
    automation_id TEXT NOT NULL REFERENCES job_automations (id) ON DELETE CASCADE,
    run_id TEXT REFERENCES automation_runs (id) ON DELETE SET NULL,
    job_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    workplace_type TEXT,
    employment_type TEXT,
    listed_at TEXT,
    description TEXT,
    url TEXT NOT NULL,
    match_reason TEXT,
    feedback TEXT,
    feedback_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    first_matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (automation_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_matched_jobs_automation
    ON automation_matched_jobs (automation_id, first_matched_at DESC);

CREATE TABLE IF NOT EXISTS automation_company_bans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_key TEXT NOT NULL,
    company_display TEXT NOT NULL,
    source_job_id TEXT,
    source_automation_id TEXT REFERENCES job_automations (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, company_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_company_bans_user
    ON automation_company_bans (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS automation_taste_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    liked_summary TEXT NOT NULL DEFAULT '',
    disliked_summary TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

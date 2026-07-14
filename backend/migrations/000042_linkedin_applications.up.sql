CREATE TABLE IF NOT EXISTS linkedin_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    job_id TEXT NOT NULL,
    application_urn TEXT,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    url TEXT NOT NULL,
    applied_at TIMESTAMPTZ,
    li_status TEXT,
    viewed_at TIMESTAMPTZ,
    resume_downloaded_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    tracked_job_id TEXT REFERENCES tracked_jobs (id) ON DELETE SET NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_applications_user
    ON linkedin_applications (user_id, applied_at DESC NULLS LAST);

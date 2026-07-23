CREATE TABLE IF NOT EXISTS design_shares (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content_mode TEXT NOT NULL DEFAULT 'DUMMY' CHECK (content_mode IN ('DUMMY', 'REAL')),
    settings_snapshot JSONB NOT NULL,
    theme_snapshot JSONB NOT NULL,
    title TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resume_id)
);

CREATE INDEX IF NOT EXISTS idx_design_shares_created_by ON design_shares (created_by);

CREATE TABLE IF NOT EXISTS curated_themes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    design_share_id TEXT NOT NULL REFERENCES design_shares (id) ON DELETE CASCADE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    featured_on_landing BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_themes_landing
    ON curated_themes (sort_order)
    WHERE featured_on_landing = TRUE;

CREATE INDEX IF NOT EXISTS idx_curated_themes_public
    ON curated_themes (sort_order)
    WHERE is_public = TRUE;

-- Portfolio-native domain: projects, skills, testimonials (not resume section mirror)

ALTER TABLE portfolios
    ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS about TEXT NOT NULL DEFAULT '';

DROP TABLE IF EXISTS portfolio_item_visibility;
DROP TABLE IF EXISTS portfolio_sections;

ALTER TABLE portfolio_settings
    DROP COLUMN IF EXISTS page_format,
    DROP COLUMN IF EXISTS font_size,
    DROP COLUMN IF EXISTS margin_horizontal_mm,
    DROP COLUMN IF EXISTS margin_vertical_mm;

ALTER TABLE portfolio_settings
    ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'SINGLE',
    ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#2563eb';

CREATE TABLE portfolio_projects (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    problem TEXT NOT NULL DEFAULT '',
    approach TEXT NOT NULL DEFAULT '',
    outcome TEXT NOT NULL DEFAULT '',
    tech_stack JSONB NOT NULL DEFAULT '[]',
    live_url TEXT,
    repo_url TEXT,
    image_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    show_in_preview BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE portfolio_skills (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    show_in_preview BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE portfolio_testimonials (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    quote TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    show_in_preview BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_portfolio_projects_portfolio ON portfolio_projects (portfolio_id, sort_order);
CREATE INDEX idx_portfolio_skills_portfolio ON portfolio_skills (portfolio_id, sort_order);
CREATE INDEX idx_portfolio_testimonials_portfolio ON portfolio_testimonials (portfolio_id, sort_order);

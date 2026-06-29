CREATE TABLE portfolios (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    title TEXT NOT NULL,
    contact_profile_id TEXT REFERENCES contact_profiles (id),
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE portfolio_settings (
    portfolio_id TEXT PRIMARY KEY REFERENCES portfolios (id) ON DELETE CASCADE,
    theme_id TEXT NOT NULL REFERENCES cv_themes (id),
    font_size TEXT NOT NULL,
    page_format TEXT NOT NULL,
    margin_horizontal_mm DOUBLE PRECISION NOT NULL DEFAULT 12,
    margin_vertical_mm DOUBLE PRECISION NOT NULL DEFAULT 12,
    show_photo BOOLEAN NOT NULL DEFAULT FALSE,
    locale TEXT NOT NULL DEFAULT 'en-US'
);

CREATE TABLE portfolio_sections (
    portfolio_id TEXT NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections (id),
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (portfolio_id, section_id)
);

CREATE TABLE portfolio_item_visibility (
    portfolio_id TEXT NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    section_item_id TEXT NOT NULL REFERENCES section_items (id),
    show_in_preview BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (portfolio_id, section_id, section_item_id)
);

CREATE INDEX idx_portfolios_workspace ON portfolios (workspace_id);

CREATE TABLE IF NOT EXISTS beta_invite_links (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    label TEXT,
    email_restrict TEXT,
    max_uses INT,
    use_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    CONSTRAINT beta_invite_links_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_links_code_lower ON beta_invite_links (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_beta_invite_links_active ON beta_invite_links (is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS beta_invite_redemptions (
    id TEXT PRIMARY KEY,
    invite_id TEXT NOT NULL REFERENCES beta_invite_links (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    redeemed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT beta_invite_redemptions_unique UNIQUE (invite_id, email)
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_redemptions_email_lower ON beta_invite_redemptions (LOWER(email));

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
    ON users (LOWER(username))
    WHERE username IS NOT NULL;

ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_owner_slug_lower
    ON portfolios (created_by, LOWER(slug))
    WHERE slug IS NOT NULL;

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_owner_slug_lower
    ON resumes (created_by, LOWER(slug))
    WHERE slug IS NOT NULL;

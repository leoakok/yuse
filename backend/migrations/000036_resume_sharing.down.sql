DROP INDEX IF EXISTS idx_resumes_owner_slug_lower;

ALTER TABLE resumes DROP COLUMN IF EXISTS slug;

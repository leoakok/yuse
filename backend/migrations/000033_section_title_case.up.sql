ALTER TABLE resume_settings
    ADD COLUMN IF NOT EXISTS section_title_case TEXT NOT NULL DEFAULT 'CAPITALIZE';

UPDATE resume_settings
SET section_title_case = CASE
    WHEN section_title_small_caps = FALSE THEN 'UPPERCASE'
    ELSE 'CAPITALIZE'
END
WHERE section_title_small_caps IS NOT NULL;

ALTER TABLE resume_settings
    DROP COLUMN IF EXISTS section_title_small_caps;

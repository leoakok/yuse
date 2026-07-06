ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS custom_key TEXT;

UPDATE sections
SET custom_key = 'custom'
WHERE type = 'CUSTOM' AND custom_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_workspace_builtin_type
    ON sections (workspace_id, type)
    WHERE type <> 'CUSTOM';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_workspace_custom_key
    ON sections (workspace_id, custom_key)
    WHERE type = 'CUSTOM' AND custom_key IS NOT NULL;

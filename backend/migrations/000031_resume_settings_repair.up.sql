-- Repair resume_settings columns when migration 000023/000024 were recorded but DDL did not apply.
ALTER TABLE resume_settings
    ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#c45c3e',
    ADD COLUMN IF NOT EXISTS section_divider_style TEXT NOT NULL DEFAULT 'FULL',
    ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'MON_YYYY';

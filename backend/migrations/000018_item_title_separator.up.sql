ALTER TABLE resume_settings
    ADD COLUMN IF NOT EXISTS item_title_separator TEXT NOT NULL DEFAULT 'DOT';

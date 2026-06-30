ALTER TABLE resume_settings
    ADD COLUMN IF NOT EXISTS contact_name_font_size TEXT NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS contact_headline_font_size TEXT NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS contact_details_font_size TEXT NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS section_title_font_size TEXT NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS item_title_font_size TEXT NOT NULL DEFAULT 'M',
    ADD COLUMN IF NOT EXISTS item_meta_font_size TEXT NOT NULL DEFAULT 'M';

-- System CV themes (idempotent)
INSERT INTO cv_themes (id, name, slug, is_system, config)
VALUES
    ('theme-classic', 'Classic', 'classic', TRUE, '{"fontFamily":"serif"}'::jsonb),
    ('theme-modern', 'Modern', 'modern', TRUE, '{"fontFamily":"sans"}'::jsonb),
    ('theme-compact', 'Compact', 'compact', TRUE, '{"density":"tight"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

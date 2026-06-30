INSERT INTO knowledge_entries (id, slug, title, category, tags, body, enabled) VALUES
(
    'kb-role-tailor',
    'role-tailor-workflow',
    'Role-target CV workflow',
    'JOB_APPLICATION',
    ARRAY['role-tailor', 'job-application', 'cv-best-practices', 'skill-gap'],
    'When the user wants a CV for a role title or type:
1. Read first: list_twin_entries, list_resumes, get_resume_content on the best base CV.
2. Research: web_search "[role] requirements skills responsibilities".
3. Assess fit honestly in your reply: strong fit, partial fit, or not ideal, with specific reasons.
4. Create: duplicate_resume or create_resume, then add_section_item for role-specific SUMMARY and new tailored EXPERIENCE/PROJECT items (same company/dates OK when bullets must differ). set_item_visibility only to hide irrelevant items.
5. Verify with get_resume_content: visible SUMMARY plus at least one experience or project with body text before saying done.',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    body = EXCLUDED.body,
    enabled = EXCLUDED.enabled,
    updated_at = NOW();

UPDATE knowledge_entries
SET tags = ARRAY['job-application', 'tailoring', 'skill-gap', 'role-tailor'],
    updated_at = NOW()
WHERE id = 'kb-job-application-playbook';

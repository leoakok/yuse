-- Knowledge dictionary: curated, tag-keyed guidance the agent injects per category.
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    body TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_category ON knowledge_entries (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_enabled ON knowledge_entries (enabled);

-- Starter dictionary. Plain language, HR-grounded. Admins can edit these later.
INSERT INTO knowledge_entries (id, slug, title, category, tags, body, enabled) VALUES
(
    'kb-cv-best-practices',
    'cv-best-practices',
    'CV best practices',
    'CREATE_CV',
    ARRAY['cv-best-practices', 'resume', 'create-cv', 'update-cv'],
    'Strong CVs share a few habits:
- Lead with impact, not duties. Each bullet should answer "what changed because I was there?" with a number when possible (%, $, time saved, scale).
- Tailor to the target role. Mirror the language of the job, surface the most relevant 3-4 experiences first, and cut anything that does not serve this application.
- Keep it scannable. Short bullets (one to two lines), consistent tense (past for past roles, present for current), and clear section order: summary, experience, education, skills.
- Be honest. Never invent employers, dates, titles, or metrics. If a fact is missing, ask the user rather than guessing.
- One page for early-career, two for 8+ years. Trim filler words and ungrounded adjectives ("hardworking", "passionate").',
    TRUE
),
(
    'kb-star-par',
    'star-par',
    'STAR and PAR for achievements',
    'UPDATE_CV',
    ARRAY['star', 'par', 'achievements', 'experience', 'digital-twin'],
    'Turn raw experience into interview-winning bullets using STAR (jobs, education) or PAR (projects, skills):
- STAR = Situation -> Task -> Action -> Result. Capture all four over time; the Result (measurable outcome) is what recruiters remember.
- PAR = Problem -> Action -> Result. Use for projects and skills where there is no formal "task".
- A good bullet compresses STAR into one line: "Cut checkout latency 40% by moving payments to an event-driven pipeline (Go, Kafka)."
- Vague bullets ("worked on backend", "led a team", "improved performance") are gaps to close. Ask one natural follow-up for the missing piece, usually the Action or the Result.
- Quantify whenever you can: percentages, dollars, users, time, team size, scale.',
    TRUE
),
(
    'kb-cover-letter',
    'cover-letter',
    'Cover letter structure',
    'JOB_APPLICATION',
    ARRAY['cover-letter', 'job-application'],
    'A tight cover letter is three to four short paragraphs:
1. Hook (1-2 sentences): the role you are applying for and one specific reason you are a strong fit.
2. Proof (1-2 paragraphs): two or three concrete achievements that map directly to the job''s top requirements. Use real numbers and STAR-style outcomes from the CV/Twin, never invented facts.
3. Fit + close (1 paragraph): why this company specifically, and a confident, low-pressure call to action.
Rules: keep it under ~300 words, address a person or team if known, mirror the posting''s keywords, and never repeat the CV verbatim. No "To whom it may concern" if you can avoid it.',
    TRUE
),
(
    'kb-job-application-playbook',
    'job-application-playbook',
    'Job application playbook',
    'JOB_APPLICATION',
    ARRAY['job-application', 'tailoring', 'skill-gap'],
    'When tailoring an application to a specific posting:
1. Research the role: extract the must-have skills, tools, and responsibilities from the posting.
2. Compare against the user''s Twin and CV. List requirements that are present, and those that are missing.
3. For each missing must-have, ask ONE short question before claiming the skill ("This role wants .NET - have you used it?"). Never fabricate a skill.
4. Tailor: a focused summary aligned to the role, reordered/edited experience that emphasises matching work, and a skills list that leads with what the job asks for.
5. Write a cover letter that connects two or three proven achievements to the posting''s top needs.
6. Save the application (resume + cover letter) so the user can track it.',
    TRUE
),
(
    'kb-ats-tips',
    'ats-tips',
    'ATS-friendly formatting',
    'CREATE_CV',
    ARRAY['ats', 'formatting', 'cv-best-practices'],
    'Applicant Tracking Systems parse text before a human reads it. To stay readable:
- Use standard section headings (Experience, Education, Skills) so the parser maps them correctly.
- Use real text, not images or text inside graphics, for anything that matters.
- Include the exact keywords from the job posting where they are genuinely true (skills, tools, certifications).
- Avoid complex multi-column layouts, tables for content, and unusual fonts that can scramble parsing.
- Save/export as PDF unless the posting asks for .docx. Keep the file name professional (First-Last-Role.pdf).
- Spell out an acronym once with its expansion so both forms are searchable ("CI/CD (continuous integration)").',
    TRUE
),
(
    'kb-career-advice',
    'career-advice',
    'General CV and career advice',
    'ADVICE',
    ARRAY['advice', 'career', 'cv-best-practices'],
    'When giving general advice (not editing a document):
- Be concrete and HR-grounded. Prefer specific, actionable steps over generic encouragement.
- Anchor advice to the user''s actual situation - ask one clarifying question if their goal or level is unclear.
- For "how do I improve my CV?" type questions: focus on impact-driven bullets, tailoring, and removing filler before talking about design.
- Keep it short and plain. A few high-value pointers beat an exhaustive checklist.
- Offer to act: if the advice maps to something Yuse can do (rewrite a bullet, tailor a CV, draft a cover letter), offer to do it.',
    TRUE
),
(
    'kb-portfolio',
    'portfolio-best-practices',
    'Portfolio best practices',
    'PORTFOLIO',
    ARRAY['portfolio', 'case-study', 'projects'],
    'A portfolio is a narrative showcase, not a CV. Make it prove the work:
- Lead with a clear hero: who you are, what you do, and the value you bring in one line.
- Present projects as case studies using Problem -> Approach -> Outcome. Show the decision, not just the deliverable.
- 3-5 strong case studies beat a long list of thin ones. Include the impact/result for each.
- Add links (live demo, repo) and a short tech stack per project.
- Keep the about section human and specific; skills should support the story, not dominate it.',
    TRUE
),
(
    'kb-out-of-scope',
    'out-of-scope',
    'Staying in scope',
    'OUT_OF_SCOPE',
    ARRAY['scope', 'guardrail'],
    'Yuse only helps with CVs/resumes, portfolios, job applications, and related career advice. Requests outside that (shopping, weather, coding help, general trivia, medical/legal/financial advice, etc.) are out of scope. When a request is out of scope, decline warmly in one or two sentences, name what you cannot help with, and redirect to what you can do - never start a tool workflow or ask "what do you want to buy?".',
    TRUE
);

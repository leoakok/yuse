CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users (id),
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE cv_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE contact_profiles (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    full_name TEXT NOT NULL,
    headline TEXT,
    email TEXT,
    phone TEXT,
    location TEXT,
    website TEXT,
    linked_in TEXT,
    github TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resumes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    title TEXT NOT NULL,
    contact_profile_id TEXT REFERENCES contact_profiles (id),
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resume_settings (
    resume_id TEXT PRIMARY KEY REFERENCES resumes (id) ON DELETE CASCADE,
    theme_id TEXT NOT NULL REFERENCES cv_themes (id),
    font_size TEXT NOT NULL,
    page_format TEXT NOT NULL,
    show_photo BOOLEAN NOT NULL DEFAULT FALSE,
    locale TEXT NOT NULL DEFAULT 'en-US'
);

CREATE TABLE sections (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE section_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    type TEXT NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE resume_sections (
    resume_id TEXT NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections (id),
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (resume_id, section_id)
);

CREATE TABLE section_item_links (
    section_id TEXT NOT NULL REFERENCES sections (id),
    section_item_id TEXT NOT NULL REFERENCES section_items (id),
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (section_id, section_item_id)
);

CREATE TABLE resume_item_visibility (
    resume_id TEXT NOT NULL REFERENCES resumes (id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    section_item_id TEXT NOT NULL REFERENCES section_items (id),
    show_in_preview BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (resume_id, section_id, section_item_id)
);

CREATE TABLE assistant_threads (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE assistant_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES assistant_threads (id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE assistant_action_logs (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    op TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    success BOOLEAN NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_resumes_workspace ON resumes (workspace_id);
CREATE INDEX idx_sections_workspace ON sections (workspace_id);
CREATE INDEX idx_section_items_workspace ON section_items (workspace_id);
CREATE INDEX idx_assistant_messages_thread ON assistant_messages (thread_id, created_at);

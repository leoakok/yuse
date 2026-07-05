-- Beta invite-only access: waitlist, user activation, admin audit trail.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS beta_waitlist (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT REFERENCES users (id),
    CONSTRAINT beta_waitlist_email_unique UNIQUE (email),
    CONSTRAINT beta_waitlist_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_beta_waitlist_status ON beta_waitlist (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email_lower ON beta_waitlist (LOWER(email));

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL REFERENCES users (id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);

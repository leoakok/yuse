DROP TABLE IF EXISTS admin_audit_log;
DROP TABLE IF EXISTS beta_waitlist;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;

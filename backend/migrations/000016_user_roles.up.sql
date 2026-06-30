-- Admin role for users. Defaults to USER; admins manage the knowledge dictionary.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';

-- Promote the known platform admin. Bootstrap logic also reapplies this on sign-in
-- so the row gets ADMIN even if it is created after this migration runs.
UPDATE users SET role = 'ADMIN' WHERE LOWER(email) = LOWER('dev@yuse.ahmetkok.dev');

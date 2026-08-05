-- Migration 13 — the auth columns on users
--
-- WHY THIS EXISTS
-- `01-create-schema-postgres.sql` does not create `password_hash`,
-- `password_salt` or `role`. Until now those were added at RUNTIME by
-- `ensureAuthColumns()` in server.js, which runs on every boot.
--
-- That was invisible while one database served both localhost and production:
-- the server had booted against it long ago, so the columns were simply there.
-- It surfaced the moment a second database was built from the migration files
-- alone — `02-seed-demo-data-postgres.sql` inserts `password_hash` and failed
-- with "column does not exist", because nothing in 01 had created it.
--
-- The migrations claimed to define the schema and did not. This closes that:
-- the SQL files alone are now enough to build a working database, and the boot
-- code becomes a redundant safety net rather than a load-bearing step.
--
-- Idempotent, so it is safe on the existing production database where these
-- columns already exist (added there by the boot code years of sessions ago).

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

UPDATE users SET role = 'user' WHERE role IS NULL;

COMMENT ON COLUMN users.password_hash IS 'PBKDF2 hash. Added by migration 13; previously created at server boot.';
COMMENT ON COLUMN users.password_salt IS 'Per-user salt for password_hash.';
COMMENT ON COLUMN users.role IS 'LEGACY flag. Authorisation is decided by admin_users via getOperatorRole(); this is a fallback only.';

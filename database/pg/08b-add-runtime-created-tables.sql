-- Migration 08b — the three tables server.js was creating at boot
--
-- WHY THIS EXISTS, AND WHY IT IS NUMBERED 08b
--
-- `password_reset_tokens`, `kyc_decisions` and `user_documents` were never in
-- any migration file. They were created at RUNTIME by `ensurePasswordResetTable()`,
-- `ensureKycDecisionsTable()` and `ensureUserDocumentsTable()` in server.js,
-- which run on every boot.
--
-- That was invisible while one database served both localhost and production —
-- the server had booted against it long ago, so the tables were simply there.
-- Building a second database from the migration files alone is what exposed it:
-- migration 09 tried to ALTER `user_documents` and failed with "relation does
-- not exist", because nothing had ever created it.
--
-- Numbered `08b` rather than `14` because migrations 09 and 10 ALTER
-- `user_documents`, so the table has to exist before them. The runner sorts on
-- the leading integer, so `08b` lands after `08` and before `09` — which is the
-- only position that works without renumbering files already applied elsewhere.
--
-- Every statement is idempotent, so this is a safe no-op on the existing
-- production database where all three tables already exist. Migrations 09 and
-- 10 are likewise no-ops after this, since their columns are declared here and
-- both use ADD COLUMN IF NOT EXISTS.
--
-- The `ensure*` functions in server.js are deliberately NOT removed. They now
-- duplicate this file rather than being the only source of it, which makes them
-- a harmless safety net instead of a hidden dependency.

-- Reset/setup tokens. The raw token is never stored — only its SHA-256 hash —
-- so a database read cannot be turned into a working reset link.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id),
  token_hash     TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  requested_ip   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash);

-- Durable record of every KYC approve/decline. Required by Compliance Manual
-- §8 (documented onboarding decision) and §9 (seven-year retention of all
-- compliance reviews and decision documentation). Insert-only: rows are never
-- updated or deleted by the app, so the history cannot be silently rewritten.
CREATE TABLE IF NOT EXISTS kyc_decisions (
  decision_id    SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(user_id),
  admin_user_id  INTEGER NOT NULL REFERENCES users(user_id),
  action         VARCHAR(10) NOT NULL CHECK (action IN ('approve', 'decline')),
  reviewer_name  TEXT NOT NULL,
  notes          TEXT NOT NULL DEFAULT '',
  decided_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kyc_decisions_user_id ON kyc_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_decisions_decided_at ON kyc_decisions(decided_at DESC);

-- Documents an admin assigns to an investor. Never hard-deleted: per the
-- seven-year retention requirement a superseded document is marked, not
-- removed. `file_name` holds the Supabase Storage object key, NOT a display
-- name — `original_file_name` is the human-readable one.
CREATE TABLE IF NOT EXISTS user_documents (
  document_id          SERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES users(user_id),
  category             VARCHAR(20) NOT NULL CHECK (category IN ('KYC', 'Finance', 'Property')),
  label                TEXT NOT NULL,
  file_name            TEXT NOT NULL,
  original_file_name   TEXT NOT NULL,
  mime_type            TEXT NOT NULL,
  uploaded_by_admin_id INTEGER NOT NULL REFERENCES users(user_id),
  is_superseded        BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Declared here as well as in migration 09 so a fresh database gets it: 09's
  -- ALTER is a no-op once this column already exists.
  property_id          BIGINT REFERENCES properties(property_id),
  -- Same reasoning as property_id, for migration 10. No DEFAULT on purpose —
  -- see 10-add-document-visibility.sql for why guessing this is the wrong shape.
  visibility           VARCHAR(20) NOT NULL DEFAULT 'investor_visible'
);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);

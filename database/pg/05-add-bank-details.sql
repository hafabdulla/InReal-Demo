-- Bank-detail fields + the request/review workflow for C.1 item 6
-- (bank-detail changes require 2FA/step-up). This is the highest-risk item
-- on the pilot list — see the tracker's C.0.3 note — so changes are never
-- applied directly. An investor's request only ever creates a PENDING row;
-- an admin has to separately verify it before it touches the live users
-- table. The investor already had to prove a fresh TOTP code to create the
-- request in the first place (enforced in the API, not just here).
--
-- The account number is encrypted at rest (same AES-256-GCM key already
-- used for TOTP secrets — see TOTP_ENCRYPTION_KEY) both on the live users
-- row and while a request is pending, since a "pending" bank number is
-- just as sensitive as a live one.
--
-- Safe to run more than once — IF NOT EXISTS guards make this idempotent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_swift_bic TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_country_code VARCHAR(2);

CREATE TABLE IF NOT EXISTS bank_detail_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  -- The full proposed field set, encrypted as one JSON blob rather than as
  -- separate plaintext columns — same reasoning as the live row above.
  proposed_values_encrypted TEXT NOT NULL,
  prior_values_encrypted TEXT,
  step_up_verified_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  reviewed_by INTEGER REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,
  rejection_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_detail_requests_user_id ON bank_detail_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_detail_requests_status ON bank_detail_requests(status);

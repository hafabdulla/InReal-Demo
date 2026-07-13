-- TOTP (authenticator-app) two-factor authentication enrollment.
-- Prerequisite for C.1 item 6 (bank-detail changes require step-up 2FA) —
-- see the implementation spec, section 6a. Built as its own table so it can
-- be swapped out cleanly for Supabase Auth's native TOTP support once
-- ADR-01 lands, without touching anything else.
--
-- Safe to run more than once — IF NOT EXISTS guard makes this idempotent.

CREATE TABLE IF NOT EXISTS user_totp (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id),
  -- AES-256-GCM ciphertext (IV + auth tag + ciphertext, base64), never the
  -- raw secret. Encrypted, not just hashed, because unlike a password we
  -- need to recover the actual secret to verify future codes against it.
  secret_encrypted TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ,
  -- One-time recovery codes, SHA-256 hashed — same non-reversible pattern as
  -- password-reset tokens elsewhere in this app. Redemption flow for these
  -- isn't built yet (see tracker) — they're stored now so that gap is a
  -- follow-up, not a redesign, when it's built.
  recovery_codes_hash TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 12 — TOTP replay guard
--
-- Deploy 1 of 3 for REQ-AUTH-07 (operator TOTP at login). No visible change.
--
-- WHY THIS IS NEEDED
-- `authenticator.check()` accepts a code for the whole of its 30-second step,
-- and otplib's default window also accepts the adjacent step either side. So a
-- single six-digit code can currently be used more than once: the same code
-- could disable 2FA and then authorise a bank-detail change, or be replayed by
-- anyone who observed it (shoulder-surfing, a screenshot, a shared screen)
-- within roughly a minute and a half.
--
-- That is tolerable while exactly one action is gated by a code. It stops being
-- tolerable once one code can unlock several things, and it becomes serious the
-- moment a code is what stands between an attacker and a session at login.
--
-- HOW IT WORKS
-- Each TOTP code corresponds to a counter — the number of 30-second steps since
-- the Unix epoch. Recording the highest counter accepted so far and refusing
-- anything at or below it makes every code single-use, without needing to store
-- the code itself.
--
-- NULL means "no code has ever been accepted for this user", which is the
-- correct starting state for both existing enrolments and new ones. It must
-- stay nullable: defaulting to 0 would work, but NULL distinguishes "never
-- used" from "used at the epoch" and the enforcement query treats them the same
-- way anyway.
--
-- BIGINT because the counter passes 2^31 in the year 2038.

ALTER TABLE user_totp
  ADD COLUMN IF NOT EXISTS last_used_counter BIGINT;

COMMENT ON COLUMN user_totp.last_used_counter IS
  'Highest TOTP step counter accepted for this user. Any code at or below this is refused as a replay. NULL = none accepted yet.';

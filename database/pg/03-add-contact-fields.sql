-- Adds the two remaining contact fields from the implementation spec's
-- "contact fields (phone, WhatsApp, preferred channel)" group (PRD
-- REQ-USR-14). phone_number already existed; this adds the other two so all
-- three can be self-edited together.
--
-- Safe to run more than once — IF NOT EXISTS guards make this idempotent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30);

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_contact_channel VARCHAR(20) DEFAULT 'phone';

-- Restrict to known values rather than leaving it a free-text field — this
-- has to match a small, fixed set of channels the ops team can actually act
-- on (nothing else in the app knows how to handle e.g. preferred_contact_channel = 'carrier pigeon').
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_preferred_contact_channel_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_preferred_contact_channel_check
      CHECK (preferred_contact_channel IN ('phone', 'whatsapp', 'email'));
  END IF;
END $$;

-- Backfill existing rows that predate this column so they have an explicit
-- value rather than relying on the column default only applying to new
-- inserts going forward.
UPDATE users SET preferred_contact_channel = 'phone' WHERE preferred_contact_channel IS NULL;

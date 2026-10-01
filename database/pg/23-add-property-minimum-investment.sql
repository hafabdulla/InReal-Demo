-- Migration 23 — a per-property minimum investment.
--
-- WHAT THIS IS FOR
--
-- The smallest amount an investor may register interest for has been one
-- number for the whole platform (`MIN_INDICATIVE_AMOUNT` in server.js): $500
-- until 17 September, then $3,000. The product owner's instruction on 30
-- September was that the two cannot be one number any longer —
--
--   "The fact is that for our pilot the min is 3k. But for the future
--    properties it will be min 250$."   (Carlo, 30 Sep 2026, WhatsApp)
--
-- and on 1 October he confirmed $250 should be what the public site shows.
-- A single global constant cannot say both. This column is where the
-- difference lives.
--
-- HOW NULL IS READ
--
-- NULL means "no minimum of its own — use the platform default". It is not
-- "no minimum". server.js resolves a property's minimum as
-- `minimum_investment ?? MIN_INDICATIVE_AMOUNT`, so a property created without
-- one follows the platform figure and moves with it. An explicit value opts
-- that property out, which is what the pilot property needs.
--
-- WHY EXISTING ROWS GET 3000 AND NEW ONES GET NULL
--
-- Every property that exists when this first runs is already subject to a
-- $3,000 minimum, because that is what the global constant is today. The
-- collateral and the two investor emails already sent to named prospects state
-- "$3,000 MINIMUM TICKET" for The Base Sukhumvit 77 specifically. So the
-- existing rows are not being given a new rule — they are having the rule they
-- already have written down, before the global figure moves to $250 underneath
-- them. Without this, dropping the global would silently lower the pilot
-- property's minimum and contradict a document prospects are holding.
--
-- This is migration 18's pattern, and for migration 18's reason. ADD COLUMN
-- with a DEFAULT gives every pre-existing row that value in the same statement
-- (Postgres records it as the value for rows predating the column), and only
-- then is the default dropped so that anything created afterwards gets NULL.
--
-- The obvious alternative — ADD the column, then
-- `UPDATE properties SET minimum_investment = 3000 WHERE minimum_investment IS
-- NULL` — is NOT re-runnable. A second run would stamp 3,000 onto every
-- property an operator had deliberately set back to "use the default" since
-- the first. Same trap migration 18 documents.
--
-- THE CHECK PINS ITS NULL CASE EXPLICITLY
--
-- `minimum_investment > 0` alone would evaluate to NULL for a NULL column, and
-- a Postgres CHECK passes when its expression is NULL rather than true — so
-- the constraint would permit exactly nothing useful while appearing to work.
-- The `IS NULL OR` branch is required, not decorative. This is the mistake
-- found in the kyc_document_reviews constraint and is noted in CLAUDE.md.
--
-- RLS: `properties` already has row level security enabled with no policies
-- (migration 14). Adding a column does not change that, and no policy is added
-- here — a policy would open a path back around server.js.
--
-- Safe to run more than once — every statement is guarded and there is no
-- UPDATE anywhere in this file.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS minimum_investment NUMERIC(18,2) DEFAULT 3000;

ALTER TABLE properties
  ALTER COLUMN minimum_investment DROP DEFAULT;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, hence the guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_minimum_investment_positive'
  ) THEN
    ALTER TABLE properties
      ADD CONSTRAINT properties_minimum_investment_positive
      CHECK (minimum_investment IS NULL OR minimum_investment > 0);
  END IF;
END $$;

COMMENT ON COLUMN properties.minimum_investment IS
  'Smallest amount an investor may register interest for on this property, in USD. NULL means use the platform default (MIN_INDICATIVE_AMOUNT). Set explicitly on the pilot property so it keeps the $3,000 stated in the investor collateral.';

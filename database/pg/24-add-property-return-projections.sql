-- Migration 24 — the return projections a property's marketing makes.
--
-- WHAT THIS IS FOR
--
-- The public property card states three things the database has never held:
--
--   target annual yield       7–9%    (a RANGE, not a point)
--   annual appreciation       3–5%    (a RANGE)
--   projected net annual ROI  8.1%    (net of the ~40% cost and fee load)
--
-- They came from the pilot investor deck and were hardcoded into
-- `src/components/Properties.jsx` on 30 September (D.56). That made the
-- marketing site a second record of a property, disagreeing with the database
-- — which is how the homepage came to describe The Base Sukhumvit 77 while the
-- investor portal had never heard of it. These columns are where they belong,
-- so one record serves the site, the portal and the API.
--
-- WHY ON property_valuations AND NOT JUST ON properties
--
-- These are forward-looking financial projections shown to prospective
-- investors. `projected_annual_yield` is already exactly that, and it already
-- lives on a valuation: Finance-gated, dated, sourced, append-only, and
-- projected onto `properties` as the most recent row (migration 19).
--
-- Putting these anywhere else would have created a second, weaker path to the
-- same kind of claim — an Operations-editable return figure with no date and
-- no source, sitting beside a Finance-only one that has both. The project has
-- a standing rule that money-adjacent fields are never a value someone typed
-- over the old one, and an unqualified return claim on a public financial page
-- is the most sensitive figure on the card, not the least. PO-9 removed
-- "15% average returns" from the login page for that reason.
--
-- So: a valuation STATES them, `properties` holds the projection of the most
-- recent one, and the same transaction writes both. Same shape as
-- property_value, monthly_rental_income and projected_annual_yield.
--
-- WHY RANGES ARE TWO COLUMNS AND NOT A STRING
--
-- '7–9%' as text cannot be validated, compared or bounded, and it would reach
-- the ops portal as operator-supplied text rendered through innerHTML — the
-- exact shape of the two stored-XSS bugs this project has already had (D.1,
-- D.11). Two numerics are checkable. Where a property has a single figure
-- rather than a range, min and max are set equal and the frontend renders one
-- number.
--
-- THE CHECKS PIN THEIR NULL BRANCHES EXPLICITLY
--
-- A Postgres CHECK passes when its expression is NULL, so `min <= max` alone
-- would permit a half-stated range (a min with no max) by evaluating to NULL.
-- Each pair is therefore both-or-neither, stated as two explicit branches.
-- This is the mistake found in the kyc_document_reviews constraint, and it is
-- in CLAUDE.md because it is easy to write the plausible version by accident.
--
-- Bounds mirror projected_annual_yield from migration 19: >= 0 and < 100. A
-- yield or appreciation at or above 100% a year is a typo, and catching it here
-- turns a numeric overflow into a named refusal.
--
-- RLS: both tables already have row level security enabled with no policies
-- (migration 14, and migration 19 for property_valuations). Adding columns
-- does not change that, and no policy is added here.
--
-- Safe to run more than once — every statement is guarded, and there is no
-- UPDATE and no backfill. Existing rows get NULL, which reads as "this
-- valuation does not state it", exactly as an omitted monthly_rental_income
-- already does.

-- What a valuation states.
ALTER TABLE property_valuations
  ADD COLUMN IF NOT EXISTS target_yield_min_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_yield_max_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_appreciation_min_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_appreciation_max_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS projected_net_annual_roi_pct NUMERIC(5,2);

-- The projection of the most recent valuation, for display.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS target_yield_min_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_yield_max_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_appreciation_min_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS target_appreciation_max_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS projected_net_annual_roi_pct NUMERIC(5,2);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['property_valuations', 'properties'] LOOP

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_target_yield_range') THEN
      EXECUTE format($f$
        ALTER TABLE %I ADD CONSTRAINT %I CHECK (
          (target_yield_min_pct IS NULL AND target_yield_max_pct IS NULL)
          OR (target_yield_min_pct IS NOT NULL AND target_yield_max_pct IS NOT NULL
              AND target_yield_min_pct >= 0 AND target_yield_max_pct < 100
              AND target_yield_min_pct <= target_yield_max_pct)
        )$f$, t, t || '_target_yield_range');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_target_appreciation_range') THEN
      EXECUTE format($f$
        ALTER TABLE %I ADD CONSTRAINT %I CHECK (
          (target_appreciation_min_pct IS NULL AND target_appreciation_max_pct IS NULL)
          OR (target_appreciation_min_pct IS NOT NULL AND target_appreciation_max_pct IS NOT NULL
              AND target_appreciation_min_pct >= 0 AND target_appreciation_max_pct < 100
              AND target_appreciation_min_pct <= target_appreciation_max_pct)
        )$f$, t, t || '_target_appreciation_range');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_net_roi_bounds') THEN
      EXECUTE format($f$
        ALTER TABLE %I ADD CONSTRAINT %I CHECK (
          projected_net_annual_roi_pct IS NULL
          OR (projected_net_annual_roi_pct >= 0 AND projected_net_annual_roi_pct < 100)
        )$f$, t, t || '_net_roi_bounds');
    END IF;

  END LOOP;
END $$;

COMMENT ON COLUMN property_valuations.target_yield_min_pct IS
  'Low end of the target annual rental yield this valuation states, in percent. Both ends or neither.';
COMMENT ON COLUMN property_valuations.projected_net_annual_roi_pct IS
  'Projected net annual return this valuation states, in percent, after costs and fees. Distinct from target yield, which is gross.';
COMMENT ON COLUMN properties.target_yield_min_pct IS
  'Projection of the most recent valuation. Written only by POST /api/ops/properties/:id/valuations.';

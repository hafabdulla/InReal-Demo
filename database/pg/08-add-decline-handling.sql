-- Decline handling + US-person flag.
--
-- From the product owner's decisions of 28 July 2026, taken after the
-- jurisdiction control moved from signup to KYC review (migration 07 / D.12).
-- Once anyone can create an account, "declined" stops being a thing that
-- happens before the relationship starts and becomes an account state the
-- platform has to actually represent. These columns are that state.
--
-- Safe to run more than once — every statement is guarded.

-- WHY the decline was refused. Drives two different behaviours, so it cannot
-- just be free text:
--
--   'jurisdiction' — not an eligible market, or the US exclusion. This is a
--                    fact about the Company's footprint, not a finding about
--                    the person, so the investor IS told plainly. Telling them
--                    stops repeat applications, and there is nothing to tip off.
--   'compliance'   — sanctions, PEP, adverse media, source-of-funds. The
--                    investor gets the PRD's neutral message (REQ-USR-13) and
--                    is NEVER told the reason. Saying it would be tipping off.
--   'suspicion'    — suspected fraud or a sanctions match. Neutral message as
--                    above, and additionally no automatic route back: a new
--                    application needs a founders' resolution first.
--
-- The distinction is load-bearing in the wrong direction if mis-set: labelling a
-- sanctions hit as 'jurisdiction' would disclose a screening finding to the
-- subject of it. The admin UI must therefore make this an explicit choice with
-- no default, never a pre-selected value.
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_decline_reason_type VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_kyc_decline_reason_type_chk'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_kyc_decline_reason_type_chk
      CHECK (kyc_decline_reason_type IS NULL
             OR kyc_decline_reason_type IN ('jurisdiction', 'compliance', 'suspicion'));
  END IF;
END $$;

-- The decision date. Explicitly requested as the anchor for retention: the
-- Manual's 7-year clock runs from "end of the Participant relationship", which
-- someone declined before submitting any documents never had. This gives that
-- cohort a clean, queryable start date for the shorter retention tier.
--
-- NOTE: nothing in this project automatically enforces retention — there is no
-- scheduler or background job anywhere in the codebase. This column records
-- when the clock started; acting on it is still a manual process, and the tier
-- length (12-24 months) is pending confirmation from the compliance owner.
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_declined_at TIMESTAMPTZ;

-- US-person self-declaration. Appendix A of the KYC/AML Manual excludes US
-- citizens, US tax residents and US Green Card holders with no exceptions in
-- Phase 1.
--
-- What this adds over the existing country checks, which is narrower than it
-- first appears: US *nationality* and US *residence* are already caught by
-- EXCLUDED_COUNTRY_CODES via assessJurisdiction. This flag exists for the cases
-- those cannot see — a Green Card holder or US tax resident who is neither a US
-- national nor resident in the US.
--
-- It is a self-declaration and therefore a speed bump, not enforcement: someone
-- can simply answer "no". The actual control remains the KYC-NUS declaration
-- document checked at review. Do not treat a false value here as verified.
ALTER TABLE users ADD COLUMN IF NOT EXISTS us_person BOOLEAN;

-- Supports finding declined applicants by cohort and by decision date, which is
-- what any future retention sweep will need to query on.
CREATE INDEX IF NOT EXISTS idx_users_kyc_declined_at ON users(kyc_declined_at)
  WHERE kyc_declined_at IS NOT NULL;

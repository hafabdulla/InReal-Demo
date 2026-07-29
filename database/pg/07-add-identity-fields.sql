-- Declared identity fields: nationality + country of residence.
--
-- Background: until now a user's country was *inferred* from the phone dial
-- code they picked at signup (see the countryCodeMap in AuthPage.jsx). That
-- meant someone living in Dubai with a UK mobile was recorded as UK, and the
-- jurisdiction check ran against a guess rather than a declaration. These
-- columns replace that guess with something the investor actually states.
--
-- `nationalities` is an ARRAY, deliberately, not a single column. The KYC/AML
-- Compliance Manual (Appendix A.16) requires every nationality held to be
-- captured for dual/multi-nationals, with the HIGHEST-risk tier across all of
-- them applying. A single `nationality` column cannot express that, and
-- retrofitting it later would mean a second migration over live investor data.
--
-- `profile_completed_at` marks whether the investor has finished the
-- post-signup profile step. NULL = not yet completed. It is a timestamp rather
-- than a boolean so the audit question "when did they declare this?" is
-- answerable, which matters for a record that feeds a compliance decision.
--
-- Safe to run more than once — every statement is guarded.

ALTER TABLE users ADD COLUMN IF NOT EXISTS country_of_residence VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationalities TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;

-- Both country fields are ISO 3166-1 alpha-2, uppercase. Enforced in the
-- database as well as the application layer, on the same reasoning as the
-- preferred_contact_channel CHECK added in migration 03: an application-layer
-- validator can be bypassed by a future endpoint that forgets to call it, a
-- CHECK constraint cannot.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_country_of_residence_iso_chk'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_country_of_residence_iso_chk
      CHECK (country_of_residence IS NULL OR country_of_residence ~ '^[A-Z]{2}$');
  END IF;
END $$;

-- Every entry in the nationalities array must also be a 2-letter uppercase
-- code, and the array must not be empty when present. An empty array would be
-- indistinguishable from "not declared" at read time while still looking like
-- a completed declaration, which is exactly the ambiguity to avoid on a field
-- that gates a compliance decision.
--
-- Written as a regex over the joined array rather than the more obvious
-- `NOT EXISTS (SELECT ... FROM unnest(...))`, because Postgres does not allow
-- subqueries inside a CHECK constraint at all. Joining with a comma and
-- matching '^[A-Z]{2}(,[A-Z]{2})*$' enforces exactly the same rule — every
-- element is two uppercase letters, and an empty array collapses to '' which
-- fails the match.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_nationalities_iso_chk'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_nationalities_iso_chk
      CHECK (
        nationalities IS NULL
        OR array_to_string(nationalities, ',') ~ '^[A-Z]{2}(,[A-Z]{2})*$'
      );
  END IF;
END $$;

-- Supports the KYC review queue, which needs to find applicants by declared
-- jurisdiction (e.g. "show me everyone declaring a prohibited nationality").
CREATE INDEX IF NOT EXISTS idx_users_country_of_residence ON users(country_of_residence);
CREATE INDEX IF NOT EXISTS idx_users_nationalities ON users USING GIN(nationalities);

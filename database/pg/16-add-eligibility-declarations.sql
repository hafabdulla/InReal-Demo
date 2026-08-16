-- The two eligibility declarations the Compliance Manual requires and the
-- platform never asked for: date of birth (§3, "natural person, aged 18 years
-- or older") and participant type (§3, "Corporate and trust participants are
-- not accepted at this stage").
--
-- Both were carried in the tracker as unbuilt compliance fixes because they
-- were only ever going to be folded into an onboarding questionnaire that has
-- not landed. They do not need it: they belong to the same declaration step
-- that already collects nationality, residence and US-person status, and that
-- step exists (migration 07 + PUT /api/user/profile/identity).
--
-- Safe to run more than once — every statement is guarded.

-- DATE, not TIMESTAMPTZ, and it matters more here than anywhere else in this
-- schema. A birthday is a calendar fact with no time and no zone; storing an
-- instant would make the same person 17 or 18 depending on where the reader
-- sits. Read it back with to_char(..., 'YYYY-MM-DD') for the same reason
-- document_issued_on is — the pg driver parses a DATE at the server's local
-- midnight and res.json() then emits it as a UTC instant, which shifts the day
-- for anyone west of the host. On a document date that is a display bug; on
-- this column it decides eligibility.
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- NULL means "never asked", which is every account created before this
-- migration and is a real state, not a missing value. It deliberately does NOT
-- mean ineligible: nothing downstream may treat an un-asked declaration as a
-- failed one, or flipping this on would strand every applicant already in the
-- Pending queue — the same shape as the country-at-signup block that made
-- legitimate applicants permanently unapprovable.
--
-- 'natural_person' is the only accepted value in Phase 1. The column exists
-- rather than being implied because the declaration is what creates the
-- consequence: the manual's position on someone who conceals their status
-- rests on their having been asked and answered. An implied value nobody
-- stated gives them "nobody asked me".
--
-- Phase 2 widens this list after legal and compliance review (Manual §3). When
-- it does, this constraint is what needs editing — and the migration runner
-- refuses to re-run an edited file, so that will be a new migration, correctly.
--
-- The NULL branch is pinned explicitly. A CHECK whose expression evaluates to
-- NULL passes, so `participant_type IN ('natural_person')` alone would admit
-- exactly the rows it looks like it forbids.
ALTER TABLE users ADD COLUMN IF NOT EXISTS participant_type VARCHAR(32);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_participant_type_chk'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_participant_type_chk
      CHECK (participant_type IS NULL OR participant_type IN ('natural_person'));
  END IF;
END $$;

-- A plausibility floor, and deliberately NOT the 18+ rule.
--
-- The obvious constraint here is `date_of_birth <= CURRENT_DATE - INTERVAL '18
-- years'`, and Postgres would accept it. It should not be written. A CHECK is
-- evaluated only when a row is written, so a non-immutable expression means the
-- constraint a row was admitted under is not the constraint that applies to the
-- next reader of that row — the table can hold rows no INSERT could produce
-- today, and pg_dump/restore re-validates against whatever CURRENT_DATE is at
-- restore time. Migration 07's country CHECKs are safe because an ISO code is a
-- format and formats do not move; an age is a computation against today, which
-- is not a constraint's job.
--
-- So the floor below is fixed and immutable, and catches the failure a format
-- check can catch: a typo'd century (1825 for 1925). The 18+ rule lives in
-- server.js at the declaration step, computed in UTC.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_date_of_birth_floor_chk'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_date_of_birth_floor_chk
      CHECK (date_of_birth IS NULL OR date_of_birth >= DATE '1900-01-01');
  END IF;
END $$;

-- Migration 15 — investor-uploaded onboarding documents, and operator sign-off
--
-- WHAT THIS IS FOR
--
-- Product owner, 6 August 2026 (PO-10): "we do need a simple upload step
-- (passport/ID scan or photo + a proof of address like a utility bill or bank
-- statement, less than 3 months old), plus an operator sign-off before
-- approval. The manual requires verified documents, not just self-typed
-- answers, even at our lowest risk tier."
--
-- Until now every row in `user_documents` was put there by an operator, for an
-- investor to read. This migration adds the opposite direction — the investor
-- uploading evidence for an operator to check — and a durable record of that
-- check.
--
-- WHY THIS EXTENDS `user_documents` RATHER THAN ADDING A SECOND TABLE
--
-- Same storage bucket, same magic-byte validation, same signed-download path,
-- same seven-year retention under Compliance Manual §9, same `is_superseded`
-- semantics on replacement. A parallel table would duplicate all of it and
-- create a second place to forget the `WHERE user_id = $1` scoping that is the
-- whole access control on this data. CLAUDE.md's standing rule against building
-- a second parallel system for a variant of something that exists applies
-- directly.
--
-- Safe to run more than once — every statement is guarded.


-- ============================================================================
-- 1. `user_documents` gains provenance, a document role, and an issue date
-- ============================================================================

-- An investor-uploaded document has no admin uploader. This column was NOT NULL
-- because, until now, one always existed.
--
-- Dropping NOT NULL is not the loosening it looks like: the CHECK constraint
-- added at the bottom of this section makes the column mandatory again for
-- exactly the rows that should have it, and forbids it on the rows that should
-- not. The invariant gets stricter, not weaker — it just stops being expressible
-- as a plain NOT NULL once the table holds two kinds of row.
ALTER TABLE user_documents ALTER COLUMN uploaded_by_admin_id DROP NOT NULL;

-- Who put this row here. Recorded explicitly rather than inferred from
-- `uploaded_by_admin_id IS NULL`, because "no admin id" would silently become
-- the definition of "investor upload", and then any future bug that failed to
-- set the admin id would reclassify an operator's document as the investor's
-- own submission — on a compliance record, in a way nothing would flag.
--
-- ON THE DEFAULT, and why this deliberately does NOT repeat migration 10's
-- two-phase dance:
--
-- Migrations now reach production BEFORE the code that needs them (CLAUDE.md),
-- so for one deploy window the currently-live build writes to this new schema
-- without knowing about this column. A default is therefore required, or every
-- operator document upload in production fails until the deploy lands.
--
-- Migration 10 added a default and then removed it in a second phase, because
-- there its default ('investor_visible') was a GUESS, and a guess in the one
-- direction that cannot be walked back — a wrongly-disclosed document has
-- already been read. Here 'operator' is not a guess: every writer that does not
-- mention this column is, by construction, the old operator-upload path, and
-- 'operator' is the correct value for it.
--
-- And the failure mode that would justify a phase 2 is already caught
-- structurally. A future investor-upload path that forgets to set `source` gets
-- 'operator' with a NULL `uploaded_by_admin_id`, which the CHECK below rejects
-- outright. The constraint is a better guard than a dropped default, because it
-- fails loudly at the moment of the mistake rather than depending on someone
-- remembering to run a phase 2 later.
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'operator';

-- WHICH onboarding requirement this document satisfies. NULL for every
-- operator-assigned document, which is the normal case and not missing data —
-- a property brochure or an account statement answers no KYC requirement.
--
-- 'source_of_funds' is declared here despite nothing collecting it yet. That is
-- not speculation: PO-15 (6 Aug 2026) settled the model as "basic = passport and
-- proof of address, advanced = basic + source of funds". The value is a decision
-- already given, and leaving it out would mean a schema change to record
-- something the product owner has already specified.
--
-- IT IS DELIBERATELY NOT COLLECTED AT ONBOARDING, and the reason is easy to get
-- wrong: Manual §5.6's Tier 1 source-of-funds evidence is a bank statement
-- showing the subscription wire leaving the Participant's own named account —
-- a wire that, at onboarding, has not happened yet. Source of funds belongs to
-- the subscription moment, not this one. See the "moments" table in the tracker's
-- decisions log.
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(30);

-- The issue date the investor declares for a proof of address, so the manual's
-- "less than 3 months old" rule can be expressed at all.
--
-- This is a DECLARED value, not a verified one — nothing in a PDF's bytes tells
-- us when a utility bill was issued. It is stored so the API can reject an
-- obviously stale document at upload time, and so the operator has the
-- applicant's own claim in front of them to check against the document itself.
-- The same declared-versus-verified split the tracker's D.30 establishes for
-- nationality: the declaration creates the liability, the operator's sign-off is
-- the evidence.
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS document_issued_on DATE;

-- Every row that exists today was assigned by an operator. Written explicitly
-- rather than relying on the column default, so this migration produces the
-- same result on a database where the column was somehow added earlier.
UPDATE user_documents SET source = 'operator' WHERE source IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_source_chk'
  ) THEN
    ALTER TABLE user_documents ADD CONSTRAINT user_documents_source_chk
      CHECK (source IN ('operator', 'investor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_kyc_doc_type_chk'
  ) THEN
    ALTER TABLE user_documents ADD CONSTRAINT user_documents_kyc_doc_type_chk
      CHECK (kyc_document_type IS NULL OR kyc_document_type IN (
        'identity', 'proof_of_address', 'source_of_funds'
      ));
  END IF;

  -- The invariant that replaces the NOT NULL dropped above, in both directions.
  --
  -- An operator row must name its uploader — that attribution is what makes the
  -- document queue auditable, and losing it silently is the thing the old NOT
  -- NULL was protecting against.
  --
  -- An investor row must NOT name one, and must say which requirement it
  -- answers. Forbidding the admin id on an investor row is the half that does
  -- the real work: it is what makes a forgotten `source` fail loudly instead of
  -- filing the investor's own passport under an operator's name.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_provenance_chk'
  ) THEN
    ALTER TABLE user_documents ADD CONSTRAINT user_documents_provenance_chk
      CHECK (
        (source = 'operator' AND uploaded_by_admin_id IS NOT NULL)
        OR
        (source = 'investor' AND uploaded_by_admin_id IS NULL AND kyc_document_type IS NOT NULL)
      );
  END IF;
END $$;

-- The hot query on the investor side is "this user's live onboarding documents,
-- one per requirement", and on the operator side the same thing for the
-- applicant being reviewed. Partial, because operator-assigned documents are the
-- large majority of this table and answer no requirement.
CREATE INDEX IF NOT EXISTS idx_user_documents_kyc_requirement
  ON user_documents(user_id, kyc_document_type)
  WHERE source = 'investor' AND is_superseded = false;


-- ============================================================================
-- 2. `kyc_document_reviews` — the operator sign-off, append-only
-- ============================================================================

-- PO-10 requires "an operator sign-off before approval". This is where that
-- sign-off is recorded.
--
-- APPEND-ONLY, for the same reason `kyc_decisions` is. A document's current
-- state is the most recent row here, never a column someone overwrote. Manual §9
-- requires seven-year retention of "all compliance decisions", and a decision
-- that can be silently replaced by a later one is not retained in any meaningful
-- sense — the reviewer who accepted a document that was later re-examined is
-- part of the record. Nothing in the app updates or deletes rows in this table.
--
-- Re-review is therefore an INSERT, not an UPDATE, and an operator reversing an
-- earlier finding leaves both findings visible.
CREATE TABLE IF NOT EXISTS kyc_document_reviews (
  review_id         SERIAL PRIMARY KEY,
  document_id       INTEGER NOT NULL REFERENCES user_documents(document_id),
  reviewer_admin_id INTEGER NOT NULL REFERENCES users(user_id),
  outcome           VARCHAR(10) NOT NULL CHECK (outcome IN ('accepted', 'rejected')),

  -- WHY A STRUCTURED CODE SITS BESIDE FREE TEXT, rather than one reason field.
  --
  -- The investor has to be told why their document was rejected, or they cannot
  -- fix it and the upload step becomes a dead end. But an operator's free text
  -- is written for colleagues and may reference screening — and Manual §8's
  -- tipping-off rule means a screening finding must never reach its subject.
  --
  -- So the split mirrors what migration 08 already did for KYC declines
  -- (`kyc_decline_reason_type` + internal notes): `reason_code` is a fixed
  -- vocabulary about the DOCUMENT, safe to show the investor verbatim; `notes`
  -- is internal and is never returned by any investor-facing endpoint.
  --
  -- Every code below is a statement about the artefact — legible, current,
  -- the right kind, matching the applicant — and none is a statement about the
  -- person. That is what makes the whole list disclosable without a case-by-case
  -- judgement each time one is used.
  reason_code       VARCHAR(40),
  notes             TEXT NOT NULL DEFAULT '',
  reviewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The `reason_code IS NOT NULL` below is load-bearing and is NOT redundant
  -- with the IN list. Without it this constraint silently allows the one row it
  -- exists to forbid — a rejection with no reason — and the first version of
  -- this file did exactly that.
  --
  -- Postgres CHECK constraints fail only on FALSE; an expression evaluating to
  -- NULL passes. With outcome='rejected' and reason_code NULL, `reason_code IN
  -- (...)` is NULL rather than FALSE under three-valued logic, so the whole
  -- expression came out NULL and the row was accepted. Caught by testing the
  -- constraint against the database instead of reading it and assuming.
  --
  -- Worth knowing when adding any future CHECK here: an IN, a comparison, or a
  -- BETWEEN against a nullable column all behave this way. The other three
  -- constraints in this migration are safe because each of their branches pins
  -- the nullable columns with an explicit IS NULL / IS NOT NULL test.
  CONSTRAINT kyc_document_reviews_reason_chk CHECK (
    (outcome = 'accepted' AND reason_code IS NULL)
    OR
    (outcome = 'rejected' AND reason_code IS NOT NULL AND reason_code IN (
      'unreadable', 'expired', 'too_old', 'wrong_document_type',
      'name_mismatch', 'incomplete', 'other'
    ))
  )
);

-- The only read pattern is "latest review for this document", and the only
-- other one is "latest review for each of this applicant's documents". Both are
-- served by document_id with the timestamp descending.
CREATE INDEX IF NOT EXISTS idx_kyc_document_reviews_document
  ON kyc_document_reviews(document_id, reviewed_at DESC);

-- REQUIRED, NOT OPTIONAL — see migration 14. Supabase publishes a PostgREST
-- endpoint for every table in `public`, so a new table is readable by anything
-- holding the anon key from the moment it exists. Enabled here, in the same
-- migration that creates the table, because the gap between "table created" and
-- "someone remembers to enable RLS" is the whole exposure.
--
-- NO POLICIES, deliberately, exactly as migration 14 established: a policy would
-- open a path back up, and this data is reached through server.js or not at all.
-- Costs nothing — the app connects as `postgres`, which has rolbypassrls.
ALTER TABLE kyc_document_reviews ENABLE ROW LEVEL SECURITY;

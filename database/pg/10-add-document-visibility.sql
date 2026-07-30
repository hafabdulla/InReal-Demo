-- Document visibility: can the investor see this document, or is it internal?
--
-- WHY THIS EXISTS
--
-- Until now every document an admin assigned to an investor was visible to that
-- investor, because `GET /api/user/documents` filtered on nothing but
-- `user_id`. There was no way to attach an internal document to someone's file.
-- That is not merely awkward — two rules in the governing documents cannot be
-- complied with without it:
--
--   1. KYC/AML Compliance Manual, Section 9 ("Security and access controls"):
--      KYC records are held under "folder-level permissions with named access
--      only. No link-sharing of any KYC document, ever." Named compliance staff,
--      not the subject of the record.
--
--   2. KYC/AML Compliance Manual, Section 8 (Suspicious Activity Reports):
--      "The SAR process is confidential. The existence of a filed SAR is not
--      disclosed to the Participant or to any third party other than the FIA and
--      the Company's external legal counsel." This is the tipping-off rule.
--      Section 9's retention list explicitly covers "all screening results,
--      including positive hit resolutions" and "all Suspicious Activity Reports
--      filed and supporting documentation" — so those records must be retained
--      AND must never be shown to their subject. Without this column, filing one
--      against an investor discloses it to them.
--
-- The PRD already anticipated this and this migration is not inventing policy.
-- Section 4's document taxonomy carries a Visibility column, and every code it
-- adds — KYC-NUS, KYC-PEP, KYC-TAX, KYC-UBO, PRP-INSP, PRP-RNV, PRP-LSE — is
-- marked `operator_only`. REQ-OPS-13 requires operators be able to "attach
-- investor-visible documents, set visibility, and publish". The two value names
-- below are the PRD's own vocabulary, not new terms coined here.
--
-- Safe to run more than once — every statement is guarded.
--
-- ============================================================================
-- RUN THIS IN TWO PHASES. THE ORDER MATTERS AND WILL BREAK PRODUCTION IF
-- IGNORED.
-- ============================================================================
--
-- This database is shared between local development and production (see
-- CLAUDE.md) — there is no separate staging instance. So the moment this file
-- runs, the CURRENTLY DEPLOYED backend on Render is talking to the new schema,
-- and that build's INSERT into user_documents does not mention `visibility`.
--
-- If the column were NOT NULL with no default from the outset, every document
-- upload in production would immediately fail with a not-null violation and
-- stay broken until the new code deployed. The window is however long a Render
-- deploy takes, and the failure is silent from the admin's side beyond a
-- generic error.
--
-- Hence the split:
--
--   PHASE 1 (below, safe to run now, before deploying):
--     adds the column WITH a default, backfills existing rows, adds the check
--     constraint and index. The old deployed code keeps working unchanged —
--     its inserts simply pick up 'investor_visible', which is exactly the
--     behaviour it has today.
--
--   PHASE 2 (at the bottom of this file, run AFTER the new code is deployed
--   and confirmed live):
--     drops the default, so a write that fails to state a visibility is
--     rejected by the database as well as by the API.
--
-- Phase 2 is not optional and not cosmetic — see its own note for why the
-- default is the wrong thing to leave in place permanently.

-- ============================================================================
-- PHASE 1 — safe to run immediately, with the old code still deployed.
-- ============================================================================

-- The default is doing two jobs here: backfilling existing rows in the same
-- statement, and keeping the currently-deployed build's inserts valid until it
-- is replaced. Phase 2 removes it.
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'investor_visible';

-- EXISTING ROWS STAY VISIBLE, deliberately.
--
-- Every document already in this table was uploaded under a contract that said
-- the investor would see it, and investors may already have opened them. Nothing
-- learned since justifies reclassifying them, and silently hiding a document
-- someone has already been shown is its own kind of wrong — it makes the portal
-- look like it lost their file. Retroactive tightening would need a human to
-- review each row, which is a compliance task, not a migration.
--
-- The backfill above is therefore the intended outcome, not a convenience.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_visibility_chk'
  ) THEN
    ALTER TABLE user_documents ADD CONSTRAINT user_documents_visibility_chk
      CHECK (visibility IN ('investor_visible', 'operator_only'));
  END IF;
END $$;

-- The investor-facing list and download both filter on (user_id, visibility).
-- Indexed together because the pair is the access predicate, not two unrelated
-- filters that happen to co-occur.
CREATE INDEX IF NOT EXISTS idx_user_documents_user_visibility
  ON user_documents(user_id, visibility);

-- NOTE ON RETENTION, so a later reader does not conflate the two: visibility is
-- orthogonal to retention. Marking a document operator_only hides it from the
-- investor and changes nothing about how long it is kept. Manual Section 9's
-- seven-year minimum applies to operator_only records exactly as it does to
-- investor-visible ones — arguably more so, since screening results and SAR
-- documentation are named in that retention list and are precisely the records
-- that will carry this flag. Nothing here may ever be implemented as a delete.


-- ============================================================================
-- PHASE 2 — run ONLY after the new backend is deployed and confirmed live.
-- Everything above is safe with the old code running; this statement is not.
-- ============================================================================
--
-- Removes the default so every future INSERT has to say what it means.
--
-- Why this is not optional, and why leaving the default would be worse than it
-- looks: the same reasoning migration 08 applied to kyc_decline_reason_type,
-- for the same shape of risk — a setting whose two directions are not equally
-- recoverable. A document wrongly marked operator_only is invisible until
-- someone notices, and is then re-filed. A document wrongly marked
-- investor_visible has already been read, and reading cannot be undone; where
-- the document is screening or SAR-supporting material, that disclosure is the
-- tipping-off Compliance Manual §8 forbids.
--
-- A default is a guess, and 'investor_visible' guesses in the one direction
-- that cannot be walked back. With the default in place, any future code path
-- that forgets the column silently discloses. Without it, that code path fails
-- loudly at the database and gets fixed. The API already rejects a missing
-- visibility; this makes the database agree, so the guarantee does not depend
-- on every future caller remembering.
--
-- This project's own history is the argument: the tracker records twice that a
-- clearly-labelled stopgap must not become permanent (the F8 "any authenticated
-- admin" gate, now carrying three financial controls). This is a stopgap with
-- an expiry date of "next deploy". Do not let it become the third.
--
-- ALTER TABLE user_documents ALTER COLUMN visibility DROP DEFAULT;

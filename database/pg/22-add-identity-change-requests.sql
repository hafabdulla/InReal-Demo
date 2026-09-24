-- Migration 22 — the identity half of the change queue (REQ-OPS-14).
--
-- WHAT THIS IS FOR
--
-- REQ-USR-14: "KYC-locked identity fields are not self-editable and route to
-- support". REQ-OPS-14: "A bank-detail and identity change queue". Until now
-- only the bank half existed. An approved investor whose name, nationality,
-- residence or date of birth changed had no route at all except an email to an
-- address nobody has confirmed receives mail.
--
-- The investor PROPOSES; an Operations reviewer DECIDES. Nothing here lets an
-- investor edit a locked field. Pending applicants still edit these fields
-- directly through PUT /api/user/profile/identity, and that is unchanged.
--
-- Shaped on bank_detail_requests (migrations 05 and 21) deliberately, so one
-- reviewer model covers both halves of the queue.
--
-- Safe to run more than once — every statement is guarded.


-- ============================================================================
-- 1. Two more kinds of investor-supplied document
-- ============================================================================

-- Evidence for a change, NOT a replacement onboarding document. They are kept
-- apart from 'identity' and 'proof_of_address' on purpose: the onboarding state
-- (getOnboardingDocumentStates) reads the live row per onboarding type, and a
-- pending change's passport sitting there as a second live 'identity' row would
-- make the investor's own Verification page, and the KYC reviewer, show
-- whichever one the query happened to return. The onboarding file stays the
-- onboarding file; a change's evidence stays attached to its change.
ALTER TABLE user_documents DROP CONSTRAINT IF EXISTS user_documents_kyc_doc_type_chk;
ALTER TABLE user_documents ADD CONSTRAINT user_documents_kyc_doc_type_chk
  CHECK (kyc_document_type IS NULL OR kyc_document_type IN (
    'identity', 'proof_of_address', 'source_of_funds', 'bank_account',
    'identity_update', 'address_update'
  ));


-- ============================================================================
-- 2. identity_change_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS identity_change_requests (
  request_id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),

  -- Only the fields being changed, keyed by the users column they would write:
  -- first_name, last_name, nationalities, country_of_residence, date_of_birth.
  -- The server allow-lists the keys; nothing else can reach users through here.
  --
  -- Not encrypted, unlike bank_detail_requests: the live columns these mirror
  -- are plaintext on users, so encrypting the proposal would protect a copy
  -- more strongly than the original and buy nothing.
  proposed_values JSONB NOT NULL,
  -- The same keys, as they stood when the request was made. What the reviewer
  -- compares against, and what the record shows was replaced.
  prior_values JSONB NOT NULL,

  -- The investor's own explanation ("married", "moved to Portugal"). Shown to
  -- the reviewer; the investor's words, not a finding.
  investor_reason TEXT NOT NULL CHECK (length(btrim(investor_reason)) > 0),

  identity_document_id INTEGER REFERENCES user_documents(document_id),
  address_document_id  INTEGER REFERENCES user_documents(document_id),

  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  reviewed_by INTEGER REFERENCES users(user_id),
  reviewed_at TIMESTAMPTZ,

  -- Same split as kyc_document_reviews: reason_code is a fixed, disclosable
  -- statement about the EVIDENCE (the same vocabulary, so the investor reads
  -- the same sentences in both places); reviewer_notes is internal and no
  -- investor-facing endpoint returns it. A change of name or nationality is
  -- exactly where a screening finding could surface, and Manual §8 forbids a
  -- screening finding reaching its subject.
  reason_code VARCHAR(40),
  reviewer_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT identity_change_requests_proposed_object
    CHECK (jsonb_typeof(proposed_values) = 'object' AND proposed_values <> '{}'::jsonb),

  -- Every branch pins the nullable columns it depends on. A CHECK whose
  -- expression is NULL passes (CLAUDE.md), so "status = 'rejected' AND
  -- reason_code IN (...)" alone would let a reasonless rejection through.
  CONSTRAINT identity_change_requests_decision CHECK (
    (status = 'pending'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND reason_code IS NULL AND reviewer_notes IS NULL)
    OR
    (status = 'approved'
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND reason_code IS NULL)
    OR
    (status = 'rejected'
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND reason_code IS NOT NULL AND reason_code IN (
        'unreadable', 'expired', 'too_old', 'wrong_document_type',
        'name_mismatch', 'incomplete', 'other'
      ))
  )
);

CREATE INDEX IF NOT EXISTS idx_identity_change_requests_user
  ON identity_change_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_identity_change_requests_queue
  ON identity_change_requests(status, created_at)
  WHERE status = 'pending';

-- One open request per investor, enforced by the database rather than only by
-- a SELECT-then-INSERT in the server, which two quick submissions could race.
CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_change_requests_one_pending
  ON identity_change_requests(user_id)
  WHERE status = 'pending';


-- ============================================================================
-- 3. identity_change_request_events — the history, append-only
-- ============================================================================

-- Same shape as bank_detail_request_events (migration 21), including recording
-- the outcome of the notice to the email on file, because mail is fail-soft
-- and "sent" cannot be assumed.
CREATE TABLE IF NOT EXISTS identity_change_request_events (
  event_id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES identity_change_requests(request_id),

  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('submitted', 'approved', 'rejected', 'prior_contact_notified')),

  channel VARCHAR(20),
  delivered BOOLEAN,
  delivery_detail VARCHAR(100),

  -- Internal. Never returned to an investor.
  note TEXT,

  actor_user_id  INTEGER REFERENCES users(user_id),
  actor_admin_id INTEGER REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT identity_change_request_events_shape CHECK (
    (event_type = 'submitted'
      AND actor_user_id IS NOT NULL AND actor_admin_id IS NULL
      AND channel IS NULL AND delivered IS NULL)
    OR
    (event_type IN ('approved', 'rejected')
      AND actor_admin_id IS NOT NULL AND actor_user_id IS NULL
      AND channel IS NULL AND delivered IS NULL)
    OR
    (event_type = 'prior_contact_notified'
      AND actor_user_id IS NULL AND actor_admin_id IS NULL
      AND channel IS NOT NULL AND channel IN ('email')
      AND delivered IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_identity_change_request_events_request
  ON identity_change_request_events(request_id, created_at, event_id);

-- Migration 14's rule: RLS on in the migration that creates the table, and no
-- policies.
ALTER TABLE identity_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_change_request_events ENABLE ROW LEVEL SECURITY;

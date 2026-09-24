-- Migration 21 — bank-detail changes gain evidence, a durable history, and a
-- record of the investor being told.
--
-- WHAT THIS IS FOR
--
-- REQ-OPS-14 and decision D-9 describe a bank-detail change as: submit →
-- step-up → operator verifies → prior contact notified → prior document
-- retained. Migration 05 built the first three. What it did not build is the
-- half that matters in a dispute:
--
--   * No bank document was filed on either side of a change, so an operator
--     approved a new payout destination on nothing but what the investor typed.
--   * Nobody was told. D-9 puts the notice in the flow precisely so that a
--     payout redirection cannot happen quietly — someone holding a stolen
--     session and a stolen phone would otherwise change the account unseen.
--   * The only audit was a console.log line on Render, which is not durable and
--     cannot be queried.
--
-- Safe to run more than once — every statement is guarded.


-- ============================================================================
-- 1. A bank document is a kind of investor-supplied document
-- ============================================================================

-- Reuses user_documents rather than adding a table, for the reasons migration
-- 15 gives at length: one bucket, one validation path, one signed-download
-- path, one seven-year retention rule, one `is_superseded` meaning.
--
-- 'bank_account' is evidence that the proposed account exists and is in the
-- investor's own name (a bank letter or a recent statement). It is NOT source
-- of funds — that belongs to the subscription moment and shows a wire that has
-- not happened yet (see the "moments" table in the tracker). One upload slot
-- must never be made to do both jobs.
ALTER TABLE user_documents DROP CONSTRAINT IF EXISTS user_documents_kyc_doc_type_chk;
ALTER TABLE user_documents ADD CONSTRAINT user_documents_kyc_doc_type_chk
  CHECK (kyc_document_type IS NULL OR kyc_document_type IN (
    'identity', 'proof_of_address', 'source_of_funds', 'bank_account'
  ));

-- Which document a request was made with. Nullable only because the seven
-- requests that predate this migration (all decided; none pending, checked on
-- both databases 24 Sep 2026) were made without one. The server refuses a new
-- request without a document and refuses to verify one that has none, so the
-- NULL is historical, not a path.
ALTER TABLE bank_detail_requests
  ADD COLUMN IF NOT EXISTS document_id INTEGER REFERENCES user_documents(document_id);


-- ============================================================================
-- 2. bank_detail_request_events — the history, append-only
-- ============================================================================

-- Same shape and same reasoning as investor_request_events (migration 20). The
-- application has no UPDATE or DELETE path for this table.
--
-- 'prior_contact_notified' records the D-9 notice, INCLUDING when delivery
-- failed. Mail is fail-soft by design (mailer.js) — a provider outage must not
-- block the change — so the only way to know afterwards whether the investor
-- was actually told is to write the outcome down.
CREATE TABLE IF NOT EXISTS bank_detail_request_events (
  event_id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES bank_detail_requests(request_id),

  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('submitted', 'verified', 'rejected', 'prior_contact_notified')),

  -- The notice's channel and outcome. Only a notification carries them.
  channel VARCHAR(20),
  delivered BOOLEAN,
  delivery_detail VARCHAR(100),

  -- Internal. Never returned to an investor.
  note TEXT,

  actor_user_id  INTEGER REFERENCES users(user_id),
  actor_admin_id INTEGER REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Every branch pins every nullable column it depends on, explicitly. A CHECK
  -- whose expression is NULL passes (CLAUDE.md, kyc_document_reviews), so
  -- "event_type = 'submitted' AND actor_user_id IS NOT NULL" on its own would
  -- let an actor-less row through.
  --
  --   submitted              → the investor, no operator, no delivery fields
  --   verified / rejected    → an operator, no investor, no delivery fields
  --   prior_contact_notified → the system: no actor, channel and outcome set
  CONSTRAINT bank_detail_request_events_shape CHECK (
    (event_type = 'submitted'
      AND actor_user_id IS NOT NULL AND actor_admin_id IS NULL
      AND channel IS NULL AND delivered IS NULL)
    OR
    (event_type IN ('verified', 'rejected')
      AND actor_admin_id IS NOT NULL AND actor_user_id IS NULL
      AND channel IS NULL AND delivered IS NULL)
    OR
    (event_type = 'prior_contact_notified'
      AND actor_user_id IS NULL AND actor_admin_id IS NULL
      AND channel IS NOT NULL AND channel IN ('email')
      AND delivered IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bank_detail_request_events_request
  ON bank_detail_request_events(request_id, created_at, event_id);

-- Backfill the history of requests made before this table existed, from the
-- columns that already record it: who submitted (user_id, created_at) and who
-- decided (reviewed_by, reviewed_at). Nothing is invented — every value comes
-- from the request row — and each backfilled event says so in its note. No
-- notification events are backfilled, because none was ever sent.
--
-- Guarded by NOT EXISTS so a re-run does not duplicate.
INSERT INTO bank_detail_request_events (request_id, event_type, actor_user_id, note, created_at)
SELECT r.request_id, 'submitted', r.user_id, 'Backfilled by migration 21 from bank_detail_requests', COALESCE(r.created_at, NOW())
FROM bank_detail_requests r
WHERE NOT EXISTS (
  SELECT 1 FROM bank_detail_request_events e
  WHERE e.request_id = r.request_id AND e.event_type = 'submitted'
);

INSERT INTO bank_detail_request_events (request_id, event_type, actor_admin_id, note, created_at)
SELECT r.request_id, r.status, r.reviewed_by, 'Backfilled by migration 21 from bank_detail_requests', r.reviewed_at
FROM bank_detail_requests r
WHERE r.status IN ('verified', 'rejected')
  AND r.reviewed_by IS NOT NULL
  AND r.reviewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bank_detail_request_events e
    WHERE e.request_id = r.request_id AND e.event_type = r.status
  );

-- Migration 14's rule: RLS on in the migration that creates the table, and no
-- policies. The app connects as `postgres` (rolbypassrls) and is unaffected.
ALTER TABLE bank_detail_request_events ENABLE ROW LEVEL SECURITY;

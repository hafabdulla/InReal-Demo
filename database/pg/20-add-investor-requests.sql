-- Investor requests: the row an investor creates when they express interest in
-- a property, and the home for every other typed request that follows.
--
-- REQ-USR-16 names this table by name: a verified investor expresses interest
-- with an indicative amount and it "writes an `investor_requests` row of type
-- `invest_interest`". Until now there was no such table. An expression of
-- interest was written into `transactions` as transaction_type
-- 'InvestmentIntent' with its whole workflow state inside a JSON `description`
-- blob — which no operator worklist can filter on. REQ-OPS-15 requires exactly
-- that filtering: by request type, status, SP, indicative amount band,
-- assignee and date. Those are columns here, not JSON keys.
--
-- Both databases held ZERO transactions of any type when this was written
-- (checked 17 Sep 2026, local and production), so nothing is migrated in and
-- nothing is lost. Every intent that ever existed was a test fixture, cleaned
-- up after its run.
--
-- ⚠️ There is deliberately NO wire reference and NO transfer-instruction column
-- here. Decision D-10 and REQ-USR-16 both say an investor is shown neither in
-- Phase 1: an indicative amount stays clear of solicitation only while it
-- promises no allocation, no price and no way to send money. The existing
-- endpoint returns both today and that is recorded as a defect to fix (D.46).
-- A column for them would invite the same mistake back.
--
-- REQ-USR-17's other request types (KYC review, new property interest,
-- secondary sale) are P1 and unbuilt. They are in the type CHECK from the
-- start so that adding one later is an application change rather than a
-- migration against a table that by then holds real rows.
--
-- Safe to run more than once — every statement is guarded.

CREATE TABLE IF NOT EXISTS investor_requests (
  request_id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),

  -- REQ-USR-16 is `invest_interest`; the rest are REQ-USR-17 and not yet
  -- reachable from any surface. `secondary_sale` stays behind decision D-11
  -- (non-binding, eligibility notice, off until the Phase 3 pathway is signed)
  -- — its presence here is vocabulary, not permission.
  request_type VARCHAR(40) NOT NULL
    CHECK (request_type IN ('invest_interest', 'kyc_review', 'new_property_interest', 'secondary_sale')),

  -- Which property. NULL for request types that are not about one (a KYC
  -- review is not), which is why this is nullable at the column level and
  -- pinned per type in the shape constraint below.
  property_id BIGINT REFERENCES properties(property_id),

  -- What the investor said they might invest. "Indicative" is the whole point:
  -- it binds nobody, allocates nothing, and reserves no fractions.
  indicative_amount NUMERIC(18,2),
  currency VARCHAR(3),

  -- The price per fraction the investor was actually shown at the moment they
  -- submitted. Derivable from property_valuations after the fact, but stored
  -- because it is what they saw: a valuation recorded next week changes the
  -- price and would otherwise silently rewrite the meaning of this row. Same
  -- reasoning as property_valuations keeping its own total_fractions and
  -- fraction_price (migration 19).
  fraction_price_at_submission NUMERIC(18,2)
    CHECK (fraction_price_at_submission IS NULL OR fraction_price_at_submission > 0),

  -- Workflow, kept to the three states REQ-OPS-15 actually requires:
  -- assignable, progressable, closable. Resist adding more until an operator
  -- asks for one — a status vocabulary invented ahead of the people using it
  -- is how a queue ends up with states nobody sets.
  status VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_progress', 'closed')),
  assigned_to_admin_id INTEGER REFERENCES users(user_id),

  -- REQ-OPS-15 asks for BOTH a date of inquiry and a date of submission, and
  -- they are not the same thing: an investor may have first asked by email or
  -- on a call weeks before anything was typed into the platform. submitted_at
  -- is an instant the server owns; inquired_on is a plain DATE an operator may
  -- record from outside, read with to_char(...,'YYYY-MM-DD') like every other
  -- DATE here (see the DATE-as-timestamp note in CLAUDE.md).
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inquired_on DATE CHECK (inquired_on IS NULL OR inquired_on >= DATE '1900-01-01'),

  closed_at TIMESTAMPTZ,
  closed_by_admin_id INTEGER REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- An expression of interest is meaningless without a property and an amount,
  -- so the database refuses one rather than trusting every future write path
  -- to remember. Both branches pin their nullable columns explicitly: a CHECK
  -- whose expression is NULL PASSES, so "request_type = 'invest_interest' AND
  -- property_id IS NOT NULL" alone would silently allow the one row it exists
  -- to forbid. That exact mistake is recorded in CLAUDE.md and cost a real
  -- bug on kyc_document_reviews.
  CONSTRAINT investor_requests_shape CHECK (
    (request_type = 'invest_interest'
      AND property_id IS NOT NULL
      AND indicative_amount IS NOT NULL
      AND currency IS NOT NULL
      AND fraction_price_at_submission IS NOT NULL)
    OR
    (request_type <> 'invest_interest')
  ),

  -- An amount, whenever one is present, is positive and names its currency.
  CONSTRAINT investor_requests_amount CHECK (
    (indicative_amount IS NULL AND currency IS NULL)
    OR (indicative_amount IS NOT NULL AND indicative_amount > 0 AND currency IS NOT NULL)
  ),

  -- Closed means closed: a close carries its timestamp and whoever closed it,
  -- and an open request carries neither. Both directions are stated, for the
  -- NULL reason above.
  CONSTRAINT investor_requests_closure CHECK (
    (status = 'closed' AND closed_at IS NOT NULL AND closed_by_admin_id IS NOT NULL)
    OR
    (status <> 'closed' AND closed_at IS NULL AND closed_by_admin_id IS NULL)
  )
);

-- The operator queue: open requests, newest first.
CREATE INDEX IF NOT EXISTS idx_investor_requests_queue
  ON investor_requests(status, submitted_at DESC, request_id DESC);

-- "My requests", scoped to the authenticated session's own user_id.
CREATE INDEX IF NOT EXISTS idx_investor_requests_user
  ON investor_requests(user_id, submitted_at DESC);

-- Interest in one property, for the property record and its ops detail.
CREATE INDEX IF NOT EXISTS idx_investor_requests_property
  ON investor_requests(property_id, submitted_at DESC)
  WHERE property_id IS NOT NULL;

-- An operator's own worklist.
CREATE INDEX IF NOT EXISTS idx_investor_requests_assignee
  ON investor_requests(assigned_to_admin_id, status)
  WHERE assigned_to_admin_id IS NOT NULL;

-- The history of a request: who assigned it, who progressed it, who closed it
-- and when. Append-only — the application has no UPDATE or DELETE path for
-- this table, and a mistake is corrected by recording what actually happened.
--
-- This exists in the same migration as the table it describes, deliberately.
-- REQ-OPS-15 requires each request be "assignable, progressable, closable with
-- audited change", and this project has no general audit-events table (still ❌
-- across the cross-cutting checklist). F15's bank-detail queue shows what
-- happens without one: its verification audit is a console.log line that goes
-- to a Render log and nowhere durable. History cannot be reconstructed after
-- the fact, so the first real request must not be the one that has none.
CREATE TABLE IF NOT EXISTS investor_request_events (
  event_id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES investor_requests(request_id),

  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('submitted', 'assigned', 'status_changed', 'contacted', 'note_added', 'closed')),

  -- Both sides of a transition, so the ledger reads without replaying it.
  from_status VARCHAR(30) CHECK (from_status IS NULL OR from_status IN ('submitted', 'in_progress', 'closed')),
  to_status   VARCHAR(30) CHECK (to_status   IS NULL OR to_status   IN ('submitted', 'in_progress', 'closed')),
  assigned_to_admin_id INTEGER REFERENCES users(user_id),

  -- Internal. No investor-facing endpoint returns this column, and none should
  -- start: the same split as kyc_document_reviews.notes, where free text may
  -- reference screening and Manual §8's tipping-off rule means a screening
  -- finding must never reach its subject. If an investor-visible message is
  -- ever wanted here, it belongs in its own column with its own vocabulary.
  note TEXT,

  -- Exactly one actor. An investor submits; an operator does everything else.
  -- Stated in both directions rather than relying on a NULL passing the CHECK.
  actor_user_id  INTEGER REFERENCES users(user_id),
  actor_admin_id INTEGER REFERENCES users(user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT investor_request_events_actor CHECK (
    (actor_user_id IS NOT NULL AND actor_admin_id IS NULL)
    OR
    (actor_user_id IS NULL AND actor_admin_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_investor_request_events_request
  ON investor_request_events(request_id, created_at DESC, event_id DESC);

-- Enabled in the same migration that creates each table, with no policies —
-- see migration 14. Supabase publishes a Data API over every public table, so
-- a new table is exposed to anything holding the anon key from the moment it
-- exists. The app is unaffected: it connects as `postgres`, which bypasses
-- RLS. Do not add a policy here; a policy opens the path back up.
ALTER TABLE investor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_request_events ENABLE ROW LEVEL SECURITY;

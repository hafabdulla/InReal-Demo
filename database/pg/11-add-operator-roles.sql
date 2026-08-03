-- F8 phase 1 — operator roles (REQ-AUTH-04, REQ-AUTH-05, REQ-AUTH-09).
--
-- PHASE 1 IS DELIBERATELY ADDITIVE AND CHANGES NO BEHAVIOUR ON ITS OWN.
-- It creates the tables and backfills them. It does NOT drop users.role, and it
-- does NOT tighten any endpoint. Running this file cannot lock anyone out of
-- the ops portal, which matters more than usual here: this database is shared
-- between local dev and production (same Supabase instance, see CLAUDE.md), so
-- "run it locally first and see" is not available as a safety net. Migration 10
-- used the same two-phase shape for the same reason.
--
-- The phases, so the ordering is not re-derived later:
--   Phase 1 (this file)  — tables + backfill. No enforcement.
--   Phase 2 (code only)  — per-endpoint role checks go live, reading these
--                          tables with a fallback to users.role.
--   Phase 3 (code only)  — TOTP mandatory for operators at login (REQ-AUTH-07).
--   Phase 4 (later file) — drop users.role and the fallback, once phases 1-3
--                          are proven in production.
--
-- Safe to run more than once — every statement is guarded.

-- ── admin_users ──────────────────────────────────────────────────────────────
-- Replaces the binary users.role column. Separate table rather than widening
-- the enum on users.role because operator identity is not a property of an
-- investor account: it is granted, audited, revocable, and F0 already calls for
-- users to be split into profiles + admin_users when that work lands.
CREATE TABLE IF NOT EXISTS admin_users (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id),

  -- REQ-AUTH-05. Three roles, no more:
  --   'super_admin'      — everything, plus granting/revoking operator access.
  --                        The only role that can write to this table.
  --   'finance_admin'    — money-adjacent actions: portfolio-value adjustments,
  --                        bank-detail verification, investment-intent review.
  --                        This is the role F8 was written to create (see the
  --                        23 June portfolio-value discussion) and the one D-17
  --                        names for reconciliation edits.
  --   'operations_admin' — KYC decisions, documents, account creation. Notably
  --                        NOT money: an ops admin can approve a person and
  --                        cannot move a number.
  role VARCHAR(20) NOT NULL,

  -- Soft revocation, never DELETE. A revoked operator must remain visible and
  -- attributable — every kyc_reviews row, portfolio_adjustments row and
  -- bank_detail_requests decision already points at a user_id, and deleting the
  -- grant would orphan the answer to "who approved this, and were they
  -- authorised at the time?" That question has a 7-year retention horizon
  -- (KYC Manual §9), far longer than anyone's employment.
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- REQ-AUTH-09: grants are attributable. NULL only for the backfill below and
  -- for the ADMIN_EMAILS bootstrap, both of which are system actions with no
  -- human grantor — that is why this is nullable rather than NOT NULL, and the
  -- audit table below records which case applied.
  granted_by INTEGER REFERENCES users(user_id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by INTEGER REFERENCES users(user_id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_chk'
  ) THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_chk
      CHECK (role IN ('super_admin', 'finance_admin', 'operations_admin'));
  END IF;
END $$;

-- ── admin_role_grants ────────────────────────────────────────────────────────
-- Append-only audit of every change to operator access (REQ-AUTH-09).
--
-- This is NOT the general audit-events table the cross-cutting requirements
-- call for — that is still unbuilt, and this does not pretend to replace it.
-- It exists because REQ-AUTH-09 requires grants and revocations specifically to
-- be audited, and shipping F8 without it would mean shipping a requirement
-- knowingly unmet. Scoped narrowly on purpose so it does not become a
-- half-built general audit log that discourages building the real one.
--
-- Append-only in the same sense as portfolio_adjustments: rows are INSERTed and
-- never UPDATEd or DELETEd. HC-9 removed a "clear log" button for this reason;
-- do not add an equivalent here.
CREATE TABLE IF NOT EXISTS admin_role_grants (
  grant_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),

  -- What happened. 'grant' covers first-time access, 'role_change' a move
  -- between roles, 'revoke' removal. Stored as data rather than inferred from
  -- comparing adjacent rows, because the inference breaks the moment a row is
  -- backdated or backfilled.
  action VARCHAR(20) NOT NULL,

  -- Role after the action. NULL for a revoke.
  role VARCHAR(20),
  -- Role before the action. NULL for a first grant.
  previous_role VARCHAR(20),

  -- NULL means a system action with no human actor: the backfill below, or the
  -- ADMIN_EMAILS boot-time bootstrap. Every other row must name a super_admin.
  performed_by INTEGER REFERENCES users(user_id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Free-text context. Mandatory at the application layer for revocations, the
  -- same way portfolio adjustments require a reason.
  note TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_role_grants_action_chk'
  ) THEN
    ALTER TABLE admin_role_grants ADD CONSTRAINT admin_role_grants_action_chk
      CHECK (action IN ('grant', 'revoke', 'role_change'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_role_grants_user
  ON admin_role_grants(user_id, performed_at DESC);

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Every current admin becomes super_admin, not a narrower role.
--
-- This looks over-permissive and is the deliberate choice. Today every one of
-- the 17 admin endpoints is gated on a single undifferentiated "is an admin"
-- check, so every existing admin already has the full set of powers. Backfilling
-- them as anything narrower would silently REVOKE access that people are
-- currently using, during a migration whose entire purpose is to not break
-- anyone — and it would do so on production, where the failure mode is an
-- operator unable to action a live KYC decision.
--
-- So phase 1 preserves the status quo exactly, and narrowing becomes a
-- deliberate, audited act performed afterwards through the portal by a
-- super_admin. FOLLOW-UP, DO NOT SKIP: assign the four bootstrap operators
-- (McKenzey, Hafiz, Carlo, Manuel) their real roles once phase 2 ships.
-- Leaving everyone super_admin permanently would reproduce the exact stopgap
-- F8 exists to remove.
INSERT INTO admin_users (user_id, role, is_active, granted_by, granted_at)
SELECT user_id, 'super_admin', true, NULL, NOW()
FROM users
WHERE role = 'admin'
  AND is_deleted = false
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_role_grants (user_id, action, role, previous_role, performed_by, note)
SELECT user_id, 'grant', 'super_admin', NULL, NULL,
       'Backfilled by migration 11 from the legacy users.role = ''admin'' flag. '
       'No human grantor: this records access that already existed rather than '
       'access newly given.'
FROM admin_users
WHERE granted_by IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_role_grants g WHERE g.user_id = admin_users.user_id
  );

-- Finding active operators by role is the query every request will make.
CREATE INDEX IF NOT EXISTS idx_admin_users_active_role
  ON admin_users(role) WHERE is_active = true;

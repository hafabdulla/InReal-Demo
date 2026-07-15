-- Admin portfolio-value adjustments (C.1 item 7). Deliberately append-only —
-- see the implementation spec's explicit warning against this ever becoming
-- a raw `UPDATE users SET portfolio_value = X`. Every adjustment is its own
-- row with a mandatory reason, so the number shown to an investor is always
-- explainable from the ledger, not just a value someone typed in once.
--
-- The displayed portfolio value is (and remains) the real, live sum of an
-- investor's actual investments — see getUserFinancialSummary() in
-- server.js — PLUS the sum of rows here. This table only ever adds to that
-- real number; it never replaces or hides how it's actually calculated.
--
-- Safe to run more than once — IF NOT EXISTS guard makes this idempotent.

CREATE TABLE IF NOT EXISTS portfolio_adjustments (
  adjustment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  adjustment_amount NUMERIC NOT NULL,   -- can be positive or negative
  reason TEXT NOT NULL,                 -- mandatory, no blank reasons
  created_by INTEGER NOT NULL REFERENCES users(user_id), -- the admin who made it
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_adjustments_user_id ON portfolio_adjustments(user_id);

-- Property valuations: the dated, sourced record behind every money figure an
-- investor is shown about a property.
--
-- REQ-OPS-04: "valuation update is a dated, audited action that recomputes the
-- derived price for display." Until now property_value, monthly_rental_income
-- and projected_annual_yield were plain columns that anything could overwrite,
-- with no date, no source, and no record of who changed them or from what.
-- Same rule as portfolio_adjustments (migration 06): a number shown to an
-- investor is explainable from a ledger, never just the last value someone
-- typed over the old one.
--
-- Each row is a complete statement — "as of this date, this source puts the
-- value at V, the rent at R and the projected yield at Y" — rather than a
-- diff, so any row can be read on its own. properties.property_value, and the
-- rent, yield and fraction_price beside it, are the projection of the most
-- recent row BY VALUATION DATE, written in the same transaction as the insert
-- and by nothing else (POST /api/ops/properties/:id/valuations). Most recent by
-- date, not by entry: recording an older report for the history must not
-- overwrite a newer valuation.
--
-- Append-only. The application has no UPDATE or DELETE path for this table; a
-- wrong entry is corrected by recording a new one that says so.
--
-- Safe to run more than once — every statement is guarded.

-- A property now exists as a draft before anyone has valued it: Operations
-- creates the record, Finance records the valuation, and publishing is refused
-- until one exists. NULL here means "not valued yet". The alternative, a 0
-- placeholder, would be a real-looking price. Every existing row has a value,
-- so this changes nothing already stored.
ALTER TABLE properties ALTER COLUMN property_value DROP NOT NULL;

CREATE TABLE IF NOT EXISTS property_valuations (
  valuation_id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(property_id),

  property_value NUMERIC(18,2) NOT NULL CHECK (property_value > 0),

  -- Optional: NULL means "this valuation does not state one", not zero. The
  -- `IS NULL OR` is written out even though a CHECK already passes on NULL,
  -- so the permission reads as intended rather than as an accident of how
  -- CHECK treats NULL (see the CLAUDE.md note on exactly that).
  monthly_rental_income NUMERIC(18,2)
    CHECK (monthly_rental_income IS NULL OR monthly_rental_income >= 0),
  projected_annual_yield NUMERIC(5,2)
    CHECK (projected_annual_yield IS NULL OR (projected_annual_yield >= 0 AND projected_annual_yield < 100)),

  -- The fraction count and the price it produced at the moment of recording,
  -- so the ledger shows what investors were shown even if the structure is
  -- changed later.
  total_fractions INT NOT NULL CHECK (total_fractions > 0),
  fraction_price NUMERIC(18,2) NOT NULL CHECK (fraction_price >= 0),

  -- "As of". A DATE, so it is read as to_char(..., 'YYYY-MM-DD') everywhere —
  -- see the DATE-as-timestamp note in CLAUDE.md. The 1900 floor is a typo
  -- guard; "not in the future" is enforced in the application, for the same
  -- reason migration 16 keeps CURRENT_DATE out of its CHECK.
  valuation_date DATE NOT NULL CHECK (valuation_date >= DATE '1900-01-01'),

  -- Where the figures came from, e.g. "Independent valuation, <firm>, report
  -- <ref>". Required, because a figure with no source is exactly what
  -- REQ-USR-15 exists to keep off an investor page. Operator-side only for
  -- now: decision D-7 keeps valuation detail operator-only at pilot, so
  -- investors are shown the date and not this text.
  source VARCHAR(200) NOT NULL CHECK (length(btrim(source)) > 0),
  note TEXT,

  recorded_by_admin_id INTEGER NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- "The current valuation of this property" is always the first row of this
-- ordering, for the investor pages, the ops list and the recompute alike.
CREATE INDEX IF NOT EXISTS idx_property_valuations_current
  ON property_valuations(property_id, valuation_date DESC, valuation_id DESC);

-- Enabled in the same migration that creates the table, with no policies — see
-- migration 14. The app connects as `postgres`, which bypasses RLS. Do not add
-- a policy here: a policy opens the path back up.
ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;

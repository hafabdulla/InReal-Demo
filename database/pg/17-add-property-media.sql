-- Property media: the image gallery an operator files against a property.
--
-- REQ-SPP-04 requires marketing media to live separately from the legal
-- property record, "so copy can change without touching the asset record or
-- any document". That is why this is a table and not more columns on
-- `properties` — which today holds exactly one `image_url`, a single VARCHAR
-- with no ordering, no publish state and no attribution.
--
-- REQ-DOC-06 puts the objects in their own `property-media` bucket, separate
-- from the private `user-documents` bucket. That separation is deliberate and
-- worth stating: `user-documents` holds passports and proof of address under a
-- seven-year retention rule; this holds photographs of a building. They are not
-- the same class of thing and must not share a lifecycle — deleting a marketing
-- photo is routine, deleting a filed KYC document is forbidden.
--
-- Safe to run more than once — every statement is guarded.

CREATE TABLE IF NOT EXISTS property_media (
  media_id BIGSERIAL PRIMARY KEY,

  property_id BIGINT NOT NULL REFERENCES properties(property_id),

  -- The object key inside the property-media bucket. UNIQUE because a row and
  -- its object are two halves of one thing: two rows pointing at one object
  -- means deleting either row breaks the other. The pairing is the failure mode
  -- that produced 22 orphaned objects when documents got it wrong.
  storage_path TEXT NOT NULL UNIQUE,

  original_file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,

  -- Doubles as the alt text, so every image carries one accessible description
  -- rather than an alt attribute nobody fills in. Short on purpose: this is a
  -- label for a photograph ("Living room, north-facing"), not marketing prose.
  --
  -- It is still an investor-facing string, and the non-CIS language rules the
  -- PRD calls Appendix A apply to every one of those. That appendix is not in
  -- this repo — the PRD references it but the text lives in v1.0, and the
  -- compliance manual's "Appendix A" is the country matrix, a different
  -- document. So REQ-OPS-13's banned-term lint cannot be written yet, and this
  -- column is deliberately the ONLY free-text field here. Marketing copy
  -- (property_content) waits for the copy rules.
  caption VARCHAR(120),

  -- Explicit ordering, because "the order they were uploaded in" is not an
  -- order anyone chose, and REQ-OPS-13 asks for media to be ordered.
  sort_order INT NOT NULL DEFAULT 0,

  -- Defaults to NOT published, and that direction is the whole point. An
  -- operator uploading a photo of the wrong unit, or an interior shot taken
  -- before renovation, has not thereby published it. The same reasoning as the
  -- document visibility column in migration 10: the two ways of being wrong are
  -- not equally recoverable, and an image that should have stayed internal has
  -- already been seen by the time anyone notices.
  is_published BOOLEAN NOT NULL DEFAULT false,

  -- NOT NULL, unlike user_documents.uploaded_by_admin_id. That column is
  -- nullable only because it carries two kinds of row and investor-uploaded
  -- evidence must NOT name an operator. Every row here is operator-filed, so
  -- there is no second case to accommodate.
  uploaded_by_admin_id INTEGER NOT NULL REFERENCES users(user_id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The gallery query is always "this property's media, in order", for both the
-- operator view and the investor one.
CREATE INDEX IF NOT EXISTS idx_property_media_property_order
  ON property_media(property_id, sort_order, media_id);

-- Enabled in the same migration that creates the table, and with no policies.
-- Supabase publishes a Data API over every public-schema table, so a new table
-- is exposed to anything holding the anon key from the moment it exists —
-- production had this wrong on 10 of 15 tables until migration 14. The app is
-- unaffected because it connects as `postgres`, which bypasses RLS. Do not add
-- a policy here: a policy opens the path back up.
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;

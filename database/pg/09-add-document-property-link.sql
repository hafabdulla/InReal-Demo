-- Link a user document to a property (PO requirement #3, 28 July 2026).
--
-- The example the product owner gave: an investor sends a money-transfer slip,
-- and that document belongs to user ABX *and* property 12X. Today
-- `user_documents` only records the user, so there is nowhere to put the
-- property half of that. This adds it.
--
-- NULLABLE on purpose — null means "general", i.e. a document that belongs to
-- the investor but not to any single property (a KYC file, an account
-- statement). That is not a missing value to be backfilled later; it is a real
-- and permanent category, and it maps directly to the "general documents in one
-- box" the investor portal shows alongside one box per property.
--
-- This also matches PRD REQ-DOC-13, which already specifies that confirmations
-- and BOAs scope to user + SP rather than to a user alone.
--
-- SECURITY NOTE for anyone extending this: property_id is a GROUPING LABEL, not
-- an access path. Every read of a document must continue to be scoped by
-- user_id against the authenticated session first — see
-- GET /api/user/documents/:id/file, whose
-- `WHERE document_id = $1 AND user_id = $2` guard is what actually stops one
-- investor reaching another's file. Never add a lookup that finds documents by
-- property_id alone, or holding a property id becomes a way to read other
-- people's documents.
--
-- Safe to run more than once — every statement is guarded.

ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS property_id BIGINT REFERENCES properties(property_id);

-- Supports the investor portal grouping documents by property, and the admin
-- queue filtering by it.
CREATE INDEX IF NOT EXISTS idx_user_documents_property_id
  ON user_documents(property_id) WHERE property_id IS NOT NULL;

-- The common investor-portal query is "this user's live documents, grouped by
-- property", so index the pair rather than property alone.
CREATE INDEX IF NOT EXISTS idx_user_documents_user_property
  ON user_documents(user_id, property_id);

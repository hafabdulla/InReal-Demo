-- `properties` has is_active (deactivate an existing listing) and is_deleted
-- (soft delete), but nothing that means "this property is a draft, not yet
-- shown to investors." Today a freshly INSERTed row is immediately live —
-- the investor-facing queries only checked is_active/is_deleted. That was
-- fine while every row was seed data meant to be live from the start; wrong
-- for anything created through the operator-facing create-property endpoint.
--
-- Deliberately NOT reusing is_active for this: is_active already has a job
-- (an operator taking a sold-out or withdrawn property off the investor list)
-- and overloading it with "never published yet" would make that column mean
-- two different things depending on history nobody can see from the value
-- alone. Same reasoning property_media.is_published already used (migration
-- 17) — defaults false, and that direction is the whole point.
--
-- Safe to run more than once — every statement is guarded, and there is
-- deliberately no UPDATE. An earlier draft of this file backfilled with
-- `UPDATE properties SET is_published = true WHERE is_published = false`,
-- which is not re-runnable: a second run publishes every draft an operator has
-- created since the first. Instead the column is added with DEFAULT true, which
-- gives every row that already exists the value true in the same statement
-- (Postgres records it as the value for rows that predate the column), and only
-- then is the default switched to false for everything created afterwards. On a
-- re-run the ADD is a no-op and SET DEFAULT changes nothing, so no draft is
-- ever touched.
--
-- Every property that exists when this first runs was already
-- investor-visible before the column existed. Starting them at false would
-- instantly unpublish the pilot's live properties.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE properties
  ALTER COLUMN is_published SET DEFAULT false;

-- Migration 14 — close the Supabase Data API on every table
--
-- WHAT THIS IS FOR
-- Supabase publishes a PostgREST endpoint for every table in the `public`
-- schema. Anything holding the project's anon key can read those tables
-- directly over HTTPS, bypassing server.js and every authorisation check in it
-- — requireOperator, the user-scoped WHERE clauses, all of it.
--
-- Before this migration, 10 of 15 production tables had RLS off, including
-- `users` (names, emails, phone numbers), `kyc_decisions`, `user_documents`,
-- `investments` and `transactions`.
--
-- WHY IT WAS NOT ALREADY AN INCIDENT
-- Reading through that API needs the anon key, and this app does not use the
-- Data API at all — it connects to Postgres directly with `pg`. The anon key is
-- not in the published frontend bundle (checked). So the door was unused rather
-- than walked through.
--
-- It is still the wrong thing to be one commit away from: the anon key is
-- DESIGNED to be public and normally lives in frontend code. The moment anyone
-- adds a Supabase client to the investor site pointing at the live project, the
-- users table becomes world-readable.
--
-- WHY THIS COSTS NOTHING
-- The application connects as `postgres`, which has rolbypassrls = true, and
-- Storage uses the service_role key, which also bypasses RLS. Enabling RLS with
-- no policies therefore denies the Data API everything and changes nothing for
-- the app. Verified empirically before writing this: the local database had RLS
-- enabled on all 15 tables, and a full sign-in plus an operator-role grant
-- through the ops portal worked normally.
--
-- NO POLICIES ARE CREATED, DELIBERATELY. A policy would open a path back up.
-- The intent is "this API is not how you reach this data", so the correct
-- configuration is RLS on and nothing else.
--
-- ANY NEW TABLE NEEDS THIS TOO. A table created later starts with RLS off and
-- is exposed from the moment it exists. The loop below is written to cover
-- whatever is present when it runs; a future table still needs its own line, or
-- this migration re-run as a new number.

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    RAISE NOTICE 'RLS enabled on %', t.relname;
  END LOOP;
END $$;

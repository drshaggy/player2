-- Grant DML privileges to anon and authenticated roles on all public tables.
--
-- RLS policies are evaluated AFTER Postgres privilege checks, so without these
-- GRANTs every client-side Supabase query (anon key) returns 42501
-- "permission denied for table <x>" and the RLS policies never run.
--
-- Migrations run via `supabase db reset` do NOT auto-grant privileges on
-- user-created tables (unlike tables created via the dashboard), so these
-- must be issued explicitly. Mirrors the privileges already present on the
-- production project (verified via information_schema.role_table_grants).
-- RLS remains the source of truth for row-level access.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moves      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_chat  TO anon, authenticated;

-- Sequences backing BIGINT GENERATED ALWAYS AS IDENTITY columns (moves, game_chat).
-- Needed so anon/authenticated can INSERT without an explicit id.
GRANT USAGE, SELECT ON SEQUENCE public.moves_id_seq     TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.game_chat_id_seq TO anon, authenticated;

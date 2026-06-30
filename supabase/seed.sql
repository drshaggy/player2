-- ============================================================================
-- Seed data (runs after migrations on `supabase db reset`)
-- See: https://supabase.com/docs/guides/local-development/seeding-your-database
-- ============================================================================

-- 1. AI bot profiles (different styles). The Coach bot is also inserted by a
--    migration; ON CONFLICT keeps idempotent across reset.
INSERT INTO public.profiles (username, is_bot, bot_style, difficulty_level, full_name)
VALUES
  ('Novice Bot',     true, 'random',     1,  'The Beginner'),
  ('Aggressive Bot', true, 'aggressive', 10, 'The Attacker'),
  ('Grandmaster Bot',true, 'strategic',  20, 'The Pro'),
  ('Chaos Bot',      true, 'chaotic',    5,  'The Unpredictable'),
  ('Coach',          true, 'educational',5,  'The Coach')
ON CONFLICT (username) DO UPDATE SET
  bot_style = EXCLUDED.bot_style,
  difficulty_level = EXCLUDED.difficulty_level,
  full_name = EXCLUDED.full_name;

-- 2. Test user (local dev only). Seeded directly into auth.users so the app is
--    usable on first `npm run dev` without manual signup. Password is
--    "password123" (bcrypt-hashed; verified with bcryptjs). Never use this
--    credential in staging/prod.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000010',
  'authenticated', 'authenticated',
  'test@player2.local',
  '$2b$10$vo6XZg05UPABxQB82QIVkOIZXS1J1PsPUcLLUo5onSIJWtb8j7X26', -- "password123"
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Test Player","full_name":"Test Player"}'
)
ON CONFLICT (id) DO NOTHING;

-- Link the test user to a profile row (the auth trigger also does this, but
-- seed runs after the trigger is defined; upsert to be safe).
INSERT INTO public.profiles (id, username, full_name)
VALUES (
  '00000000-0000-4000-8000-000000000010',
  'Test Player',
  'Test Player'
)
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, full_name = EXCLUDED.full_name;

-- 3. Sample game: Test Player (white) vs Coach (black) at the starting position.
INSERT INTO public.games (id, white_player_id, black_player_id, current_fen, current_turn, status)
VALUES (
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000010', -- Test Player
  (SELECT id FROM public.profiles WHERE username = 'Coach'), -- Coach bot
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'w',
  'ongoing'
)
ON CONFLICT (id) DO NOTHING;

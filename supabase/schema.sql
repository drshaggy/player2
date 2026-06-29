-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_bot BOOLEAN DEFAULT FALSE,
  bot_style TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 20),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id, 
    coalesce(new.raw_user_meta_data->>'username', new.email), 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Games Table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id UUID NOT NULL REFERENCES public.profiles(id),
  black_player_id UUID NOT NULL REFERENCES public.profiles(id),
  current_fen TEXT NOT NULL,
  current_turn CHAR(1) NOT NULL CHECK (current_turn IN ('w', 'b')),
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'white_win', 'black_win', 'draw')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Moves Table
CREATE TABLE public.moves (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  player_color CHAR(1) NOT NULL CHECK (player_color IN ('w', 'b')),
  move_san TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_games_white_player ON public.games(white_player_id);
CREATE INDEX idx_games_black_player ON public.games(black_player_id);
CREATE INDEX idx_moves_game_id ON public.moves(game_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON public.games
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are viewable by participants" ON public.games 
  FOR SELECT USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);
CREATE POLICY "Users can create games" ON public.games 
  FOR INSERT WITH CHECK (auth.uid() = white_player_id OR auth.uid() = black_player_id);
CREATE POLICY "Users can update their own games" ON public.games 
  FOR UPDATE USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moves are viewable by game participants" ON public.moves 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );
CREATE POLICY "Users can insert moves into their games" ON public.moves 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

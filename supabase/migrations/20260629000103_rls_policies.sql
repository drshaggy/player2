-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;

-- Profiles: Everyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Profiles: Only the user can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Games: Players involved in the game can view it
CREATE POLICY "Players can view their own games" ON public.games
  FOR SELECT USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Games: Players involved can update the game state
CREATE POLICY "Players can update their own games" ON public.games
  FOR UPDATE USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Games: Players involved can insert (create) a game
CREATE POLICY "Players can insert their own games" ON public.games
  FOR INSERT WITH CHECK (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Moves: Players involved in the game can view moves
CREATE POLICY "Players can view moves of their own games" ON public.moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

-- Moves: Players involved can insert moves
CREATE POLICY "Players can insert moves into their own games" ON public.moves
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = moves.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

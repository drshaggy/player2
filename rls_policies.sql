-- Enable RLS
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

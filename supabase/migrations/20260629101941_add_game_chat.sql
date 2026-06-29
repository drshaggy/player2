-- Create a table to persist chat messages for a game
CREATE TABLE public.game_chat (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by game
CREATE INDEX idx_game_chat_game_id ON public.game_chat(game_id);

-- RLS POLICIES
ALTER TABLE public.game_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat is viewable by game participants" ON public.game_chat 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = game_chat.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert chat into their games" ON public.game_chat 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE games.id = game_chat.game_id 
      AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    )
  );

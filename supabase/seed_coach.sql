INSERT INTO public.profiles (username, is_bot, bot_style, difficulty_level, full_name) 
VALUES ('Coach', true, 'educational', 5, 'The Coach') 
ON CONFLICT (username) DO UPDATE SET bot_style = 'educational', difficulty_level = 5;

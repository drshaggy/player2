-- Seed AI profiles with different bot styles
INSERT INTO public.profiles (username, is_bot, bot_style, difficulty_level, full_name)
VALUES 
('Novice Bot', true, 'random', 1, 'The Beginner'),
('Aggressive Bot', true, 'aggressive', 10, 'The Attacker'),
('Grandmaster Bot', true, 'strategic', 20, 'The Pro'),
('Chaos Bot', true, 'chaotic', 5, 'The Unpredictable');

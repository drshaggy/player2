import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

/** True when the app is pointed at local Supabase (127.0.0.1:54321). */
export const isLocalSupabase = supabaseUrl.startsWith('http://127.0.0.1') || supabaseUrl.startsWith('http://localhost');

/** Seeded test user — exists only in local Supabase (see supabase/seed.sql). */
export const DEV_TEST_USER = { email: 'test@player2.local', password: 'password123' };

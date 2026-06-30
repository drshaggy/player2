'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, isLocalSupabase, DEV_TEST_USER } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<ReturnType<typeof Object> | null>(null);
  const userRef = useRef<typeof user>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let u = session?.user ?? null;
      // Local dev: auto-login the seeded test user if no session exists.
      // Disable with NEXT_PUBLIC_DEV_AUTO_LOGIN=0.
      if (!u && isLocalSupabase && process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN !== '0') {
        const { data, error } = await supabase.auth.signInWithPassword(DEV_TEST_USER);
        if (!error && data.user) u = data.user;
      }
      setUser(u);
      userRef.current = u;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      userRef.current = u;
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        console.error("signInWithOAuth error:", error);
        alert(`Login error: ${error.message}`);
      }
    } catch (err) {
      console.error("Login exception:", err);
      alert(`Unexpected error: ${err}`);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return { user, userRef, handleLogin, handleLogout };
}

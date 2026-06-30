'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<ReturnType<typeof Object> | null>(null);
  const userRef = useRef<typeof user>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
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

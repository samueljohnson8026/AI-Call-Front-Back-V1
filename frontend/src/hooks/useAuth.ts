import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { AuthService } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { session } = await AuthService.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    // Listen for auth state changes
    const unsubscribe = AuthService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
      // Force reload to clear state
      window.location.reload();
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}
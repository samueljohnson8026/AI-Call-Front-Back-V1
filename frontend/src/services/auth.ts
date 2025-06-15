import { supabase } from '../lib/supabase';
import { mockAuth } from '../lib/mockAuth';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string
  status?: number
}

export interface SignUpData {
  email: string
  password: string
  clientName: string
  companyName?: string
  phoneNumber?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ResetPasswordData {
  email: string
}

export class AuthService {
  // Check if we're in demo mode
  private static isDemoMode(): boolean {
    // Get the current mode from localStorage (set by AppContext)
    const appMode = localStorage.getItem('app_mode');
    const isDemo = appMode === 'demo';
    
    console.log('Demo mode check:', {
      appMode,
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      result: isDemo
    });
    return isDemo;
  }

  // Sign up new user
  static async signUp(data: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
    if (this.isDemoMode()) {
      const result = await mockAuth.signUp(data);
      return { user: result.data.user, error: result.error };
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            client_name: data.clientName,
            company_name: data.companyName,
            phone_number: data.phoneNumber
          }
        }
      });

      if (error) {
        return { user: null, error: { message: error.message } };
      }

      return { user: authData.user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: { message: 'An unexpected error occurred' } };
    }
  }

  // Sign in existing user
  static async signIn(data: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
    if (this.isDemoMode()) {
      const result = await mockAuth.signInWithPassword(data);
      return { user: result.data.user as unknown as User, error: result.error };
    }

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        return { user: null, error: { message: error.message } };
      }

      return { user: authData.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error: { message: 'An unexpected error occurred' } };
    }
  }

  // Sign out user
  static async signOut(): Promise<{ error: AuthError | null }> {
    if (this.isDemoMode()) {
      await mockAuth.signOut();
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  }

  // Get current session
  static async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    if (this.isDemoMode()) {
      const result = await mockAuth.getSession();
      return { session: result.data.session, error: result.error };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return { session: null, error: { message: error.message } };
      }

      return { session: data.session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, error: { message: 'An unexpected error occurred' } };
    }
  }

  // Reset password
  static async resetPassword(data: ResetPasswordData): Promise<{ error: AuthError | null }> {
    if (this.isDemoMode()) {
      const result = await mockAuth.resetPasswordForEmail(data.email);
      return { error: result.error };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  }

  // Resend confirmation email
  static async resendConfirmation(data: ResetPasswordData): Promise<{ error: AuthError | null }> {
    if (this.isDemoMode()) {
      // In demo mode, just return success
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`
        }
      });
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return { error: { message: 'An unexpected error occurred' } };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (this.isDemoMode()) {
      // For demo mode, we'll simulate auth state changes
      const checkDemoAuth = () => {
        const demoSession = localStorage.getItem('demo_session');
        if (demoSession) {
          try {
            const session = JSON.parse(demoSession);
            if (session.expires_at > Date.now()) {
              callback('SIGNED_IN', session);
            } else {
              localStorage.removeItem('demo_session');
              localStorage.removeItem('demo_user');
              callback('SIGNED_OUT', null);
            }
          } catch (error) {
            callback('SIGNED_OUT', null);
          }
        } else {
          callback('SIGNED_OUT', null);
        }
      };

      // Check immediately
      checkDemoAuth();

      // Set up a listener for localStorage changes (for demo mode)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'demo_session') {
          checkDemoAuth();
        }
      };

      window.addEventListener('storage', handleStorageChange);

      // Return cleanup function
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  }

  // Get demo credentials (for demo mode)
  static getDemoCredentials() {
    return {
      email: 'demo@example.com',
      password: 'demo123'
    };
  }
}
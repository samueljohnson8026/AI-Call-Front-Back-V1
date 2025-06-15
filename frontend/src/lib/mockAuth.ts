// Mock authentication for demo purposes when Supabase is not configured
export const mockAuth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for admin credentials
    if (email === 'gamblerspassion@gmail.com' && password === 'AdminPass123!') {
      const mockUser = {
        id: 'admin-user-id',
        email: 'gamblerspassion@gmail.com',
        user_metadata: {
          name: 'Admin User',
          role: 'admin'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in localStorage for demo
      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_session', JSON.stringify({
        user: mockUser,
        access_token: 'admin-demo-token',
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }));
      
      return { data: { user: mockUser }, error: null };
    } else if (email === 'demo@example.com' && password === 'demo123') {
      const mockUser = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        user_metadata: {
          name: 'Demo User'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in localStorage for demo
      localStorage.setItem('demo_user', JSON.stringify(mockUser));
      localStorage.setItem('demo_session', JSON.stringify({
        user: mockUser,
        access_token: 'demo-token',
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }));
      
      return { data: { user: mockUser }, error: null };
    } else {
      return { 
        data: { user: null }, 
        error: { message: 'Invalid email or password' } 
      };
    }
  },

  signUp: async ({ email: _email, password: _password }: { email: string; password: string }) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { 
      data: { user: null }, 
      error: { message: 'Sign up requires Supabase configuration' } 
    };
  },

  signOut: async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_session');
    return { error: null };
  },

  getSession: async () => {
    const session = localStorage.getItem('demo_session');
    if (session) {
      const parsedSession = JSON.parse(session);
      if (parsedSession.expires_at > Date.now()) {
        return { data: { session: parsedSession }, error: null };
      }
    }
    return { data: { session: null }, error: null };
  },

  resetPasswordForEmail: async (_email: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { 
      data: {}, 
      error: { message: 'Password reset requires Supabase configuration' } 
    };
  }
};
import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppMode = 'demo' | 'live'

interface AppContextType {
  mode: AppMode
  setMode: (mode: AppMode) => void
  isDemo: boolean
  isLive: boolean
  toggleMode: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('live');

  useEffect(() => {
    // Check if we have proper Supabase configuration
    const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && 
                             import.meta.env.VITE_SUPABASE_ANON_KEY &&
                             import.meta.env.VITE_SUPABASE_URL !== 'https://demo.supabase.co';
    
    // Check if demo mode is enabled in environment
    const demoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
    
    // Get saved mode from localStorage
    const savedMode = localStorage.getItem('app_mode') as AppMode;
    
    // Determine initial mode
    let initialMode: AppMode = 'live';
    
    if (hasSupabaseConfig) {
      // Force live mode when proper Supabase config is available
      initialMode = 'live';
    } else if (savedMode && (savedMode === 'demo' || savedMode === 'live')) {
      initialMode = savedMode;
    } else if (!hasSupabaseConfig && demoModeEnabled) {
      // Fall back to demo if no Supabase config
      initialMode = 'demo';
    }
    
    console.log('App mode initialization:', {
      hasSupabaseConfig,
      demoModeEnabled,
      savedMode,
      initialMode
    });
    
    setMode(initialMode);
  }, []);

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem('app_mode', newMode);
    console.log('App mode changed to:', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'demo' ? 'live' : 'demo';
    handleSetMode(newMode);
  };

  const value = {
    mode,
    setMode: handleSetMode,
    isDemo: mode === 'demo',
    isLive: mode === 'live',
    toggleMode
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
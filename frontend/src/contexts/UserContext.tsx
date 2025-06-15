import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Profile } from '../lib/supabase';
import { DatabaseService } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface UserContextType {
  user: Profile | null
  loading: boolean
  updateUser: (updates: Partial<Profile>) => Promise<void>
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  const loadUser = async () => {
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await DatabaseService.getProfile(authUser.id);
      setUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load user profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [authUser]);

  const updateUser = async (updates: Partial<Profile>) => {
    if (!user || !authUser) {
      toast.error('No user to update');
      return;
    }

    try {
      const updatedProfile = await DatabaseService.updateProfile(authUser.id, updates);
      
      if (updatedProfile) {
        setUser(updatedProfile);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, updateUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for checking permissions
export function usePermissions() {
  const { user } = useUser();
  
  return {
    canUseInbound: user?.can_use_inbound ?? false,
    canUseOutboundDialer: user?.can_use_outbound_dialer ?? false,
    maxAgentConfigurations: user?.max_concurrent_calls ?? 1,
    hasReachedAgentLimit: (currentCount: number) => 
      currentCount >= (user?.max_concurrent_calls ?? 1),
    planName: user?.plan_name ?? 'free'
  };
}
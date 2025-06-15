import { useAuth } from './useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserPermissions {
  dashboard: boolean
  agents: boolean
  calls: boolean
  campaigns: boolean
  analytics: boolean
  appointments: boolean
  billing: boolean
  settings: boolean
  webhooks: boolean
  dnc: boolean
  status: boolean
}

export interface UserProfile {
  id: string
  email: string
  client_name?: string
  company_name?: string
  phone_number?: string
  permissions: UserPermissions
  usage_cap: number
  used_minutes: number
  is_active: boolean
  created_at: string
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setPermissions(null);
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      // Check if user is admin
      const adminEmail = 'gamblerspassion@gmail.com';
      const userIsAdmin = user.email === adminEmail;

      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // Admin has all permissions
        const adminPermissions: UserPermissions = {
          dashboard: true,
          agents: true,
          calls: true,
          campaigns: true,
          analytics: true,
          appointments: true,
          billing: true,
          settings: true,
          webhooks: true,
          dnc: true,
          status: true
        };
        setPermissions(adminPermissions);
        setProfile({
          id: user.id,
          email: user.email || '',
          client_name: 'Admin',
          permissions: adminPermissions,
          usage_cap: 0, // unlimited for admin
          used_minutes: 0,
          is_active: true,
          created_at: new Date().toISOString()
        });
      } else {
        // Load regular user profile from database
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading user profile:', error);
          // Set default permissions if profile not found
          const defaultPermissions: UserPermissions = {
            dashboard: true,
            agents: false,
            calls: false,
            campaigns: false,
            analytics: false,
            appointments: false,
            billing: false,
            settings: false,
            webhooks: false,
            dnc: false,
            status: false
          };
          setPermissions(defaultPermissions);
        } else {
          const userPermissions = data.permissions || {
            dashboard: true,
            agents: false,
            calls: false,
            campaigns: false,
            analytics: false,
            appointments: false,
            billing: false,
            settings: false,
            webhooks: false,
            dnc: false,
            status: false
          };
          
          setPermissions(userPermissions);
          setProfile({
            id: data.id,
            email: data.email,
            client_name: data.client_name,
            company_name: data.company_name,
            phone_number: data.phone_number,
            permissions: userPermissions,
            usage_cap: data.usage_cap || 1000,
            used_minutes: data.used_minutes || 0,
            is_active: data.is_active,
            created_at: data.created_at
          });
        }
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    return permissions?.[permission] || false;
  };

  const canAccess = (route: string): boolean => {
    if (isAdmin) return true;
    
    const routePermissionMap: Record<string, keyof UserPermissions> = {
      '/dashboard': 'dashboard',
      '/enhanced-dashboard': 'dashboard', // Enhanced dashboard uses same permission as dashboard
      '/agents': 'agents',
      '/calls': 'calls',
      '/live-calls': 'calls', // Live calls uses same permission as calls
      '/campaigns': 'campaigns',
      '/enhanced-campaigns': 'campaigns', // Enhanced campaigns uses same permission as campaigns
      '/analytics': 'analytics',
      '/appointments': 'appointments',
      '/billing': 'billing',
      '/settings': 'settings',
      '/webhooks': 'webhooks',
      '/dnc': 'dnc',
      '/status': 'status'
    };

    const requiredPermission = routePermissionMap[route];
    return requiredPermission ? hasPermission(requiredPermission) : false;
  };

  const isUsageExceeded = (): boolean => {
    if (isAdmin || !profile) return false;
    if (profile.usage_cap === 0) return false; // unlimited
    return profile.used_minutes >= profile.usage_cap;
  };

  const getUsagePercentage = (): number => {
    if (isAdmin || !profile) return 0;
    if (profile.usage_cap === 0) return 0; // unlimited
    return Math.min((profile.used_minutes / profile.usage_cap) * 100, 100);
  };

  const getRemainingMinutes = (): number => {
    if (isAdmin || !profile) return Infinity;
    if (profile.usage_cap === 0) return Infinity; // unlimited
    return Math.max(profile.usage_cap - profile.used_minutes, 0);
  };

  return {
    permissions,
    profile,
    loading,
    isAdmin,
    hasPermission,
    canAccess,
    isUsageExceeded,
    getUsagePercentage,
    getRemainingMinutes,
    refreshProfile: loadUserProfile
  };
}
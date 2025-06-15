import { supabase } from '../lib/supabase';

export interface CreateUserData {
  email: string
  password: string
  clientName: string
  companyName?: string
  phoneNumber?: string
  usageCap: number
  maxAgents: number
  permissions: Record<string, boolean>
}

export interface UserData {
  id: string
  email: string
  clientName: string
  companyName?: string
  phoneNumber?: string
  usageCap: number
  maxAgents: number
  usedMinutes: number
  permissions: Record<string, boolean>
  createdAt: string
  isActive: boolean
}

export class AdminAPI {
  // Create a new user (admin only)
  static async createUser(userData: CreateUserData): Promise<{ user: UserData | null; error: string | null }> {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Skip email confirmation for admin-created users
        user_metadata: {
          client_name: userData.clientName,
          company_name: userData.companyName,
          phone_number: userData.phoneNumber,
          role: 'user'
        }
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      // Then create the user profile with permissions and usage cap
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          role: 'user',
          subscription_plan: 'basic',
          minutes_used: 0,
          minutes_limit: userData.usageCap,
          max_agents: userData.maxAgents,
          allowed_features: Object.keys(userData.permissions).filter(key => userData.permissions[key])
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { user: null, error: profileError.message };
      }

      const user: UserData = {
        id: profileData.id,
        email: profileData.email,
        clientName: authData.user.user_metadata?.client_name || userData.clientName,
        companyName: authData.user.user_metadata?.company_name || userData.companyName,
        phoneNumber: authData.user.user_metadata?.phone_number || userData.phoneNumber,
        usageCap: profileData.minutes_limit,
        maxAgents: profileData.max_agents,
        usedMinutes: profileData.minutes_used,
        permissions: userData.permissions,
        createdAt: profileData.created_at,
        isActive: true
      };

      return { user, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  }

  // Get all users (admin only)
  static async getUsers(): Promise<{ users: UserData[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { users: [], error: error.message };
      }

      const users: UserData[] = data.map(profile => ({
        id: profile.id,
        email: profile.email,
        clientName: profile.email.split('@')[0], // Fallback to email username
        companyName: '', // Will need to get from user_metadata
        phoneNumber: '', // Will need to get from user_metadata
        usageCap: profile.minutes_limit,
        maxAgents: profile.max_agents,
        usedMinutes: profile.minutes_used,
        permissions: profile.allowed_features ? profile.allowed_features.reduce((acc: Record<string, boolean>, feature: string) => {
          acc[feature] = true;
          return acc;
        }, {}) : {},
        createdAt: profile.created_at,
        isActive: profile.role !== 'disabled'
      }));

      return { users, error: null };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], error: 'An unexpected error occurred' };
    }
  }

  // Update user status (admin only)
  static async updateUserStatus(userId: string, isActive: boolean): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: isActive ? 'user' : 'disabled' })
        .eq('id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating user status:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  // Delete user (admin only)
  static async deleteUser(userId: string): Promise<{ error: string | null }> {
    try {
      // Delete from users first
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileError) {
        return { error: profileError.message };
      }

      // Then delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        return { error: authError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  // Update user usage (called when user makes calls)
  static async updateUserUsage(userId: string, minutesUsed: number): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ minutes_used: minutesUsed })
        .eq('id', userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating user usage:', error);
      return { error: 'An unexpected error occurred' };
    }
  }
}
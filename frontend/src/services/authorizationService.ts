import type { Profile } from '../lib/supabase';

export interface AuthorizationResult {
  authorized: boolean
  reason?: string
  remainingMinutes?: number
}

/**
 * Authorization service for call gating
 * This would typically make a call to your Supabase authorize-call function
 */
export class AuthorizationService {
  /**
   * Check if a user is authorized to make a call
   * This simulates the authorize-call function that would run on your backend
   */
  static async authorizeCall(
    userId: string, 
    callType: 'inbound' | 'outbound',
    estimatedDurationMinutes: number = 5
  ): Promise<AuthorizationResult> {
    try {
      // In a real implementation, this would call your Supabase function
      // const { data, error } = await supabase.rpc('authorize_call', {
      //   user_id: userId,
      //   call_type: callType,
      //   estimated_duration: estimatedDurationMinutes
      // })

      // For demo purposes, we'll simulate the authorization logic
      const mockUser = await this.getMockUserProfile(userId);
      
      if (!mockUser) {
        return {
          authorized: false,
          reason: 'User not found'
        };
      }

      // Check if user is active
      if (!mockUser.is_active) {
        return {
          authorized: false,
          reason: 'Account is inactive'
        };
      }

      // Check feature permissions
      if (callType === 'inbound' && !mockUser.can_use_inbound) {
        return {
          authorized: false,
          reason: 'Inbound calls not permitted for this plan'
        };
      }

      if (callType === 'outbound' && !mockUser.can_use_outbound_dialer) {
        return {
          authorized: false,
          reason: 'Outbound dialer not permitted for this plan'
        };
      }

      // Check usage limits
      const remainingMinutes = mockUser.monthly_minute_limit - mockUser.minutes_used;
      
      if (remainingMinutes <= 0) {
        return {
          authorized: false,
          reason: 'Monthly minute limit exceeded',
          remainingMinutes: 0
        };
      }

      if (remainingMinutes < estimatedDurationMinutes) {
        return {
          authorized: false,
          reason: `Insufficient minutes remaining (${remainingMinutes} min available, ${estimatedDurationMinutes} min estimated)`,
          remainingMinutes
        };
      }

      // Authorization successful
      return {
        authorized: true,
        remainingMinutes
      };

    } catch (error) {
      console.error('Authorization check failed:', error);
      return {
        authorized: false,
        reason: 'Authorization service unavailable'
      };
    }
  }

  /**
   * Record call usage after a call completes
   * This would update the user's minutes_used in the database
   */
  static async recordCallUsage(
    userId: string,
    actualDurationMinutes: number
  ): Promise<boolean> {
    try {
      // In a real implementation:
      // const { error } = await supabase.rpc('record_call_usage', {
      //   user_id: userId,
      //   duration_minutes: actualDurationMinutes
      // })

      console.log(`Recording ${actualDurationMinutes} minutes of usage for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to record call usage:', error);
      return false;
    }
  }

  /**
   * Get user profile for authorization checks
   * In production, this would query your Supabase profiles table
   */
  private static async getMockUserProfile(userId: string): Promise<Profile | null> {
    // Mock user data - in production this would be a database query
    const mockUser: Profile = {
      id: userId,

      client_name: 'Demo User',
      company_name: 'AI Call Center Demo',
      email: 'demo@callcenter.ai',
      phone_number: '+1 (555) 123-4567',
      plan_name: 'pro',
      monthly_minute_limit: 1000,
      minutes_used: 752,


      is_active: true,

      can_use_inbound: true,
      can_use_outbound_dialer: true,
      max_concurrent_calls: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-10T00:00:00Z'
    };

    return mockUser;
  }
}
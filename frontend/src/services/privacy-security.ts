import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';

export interface PIIField {
  field_name: string
  field_type: 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'credit_card' | 'custom'
  encryption_level: 'none' | 'standard' | 'high'
  retention_days?: number
}

export interface DataRetentionPolicy {
  id: string
  profile_id: string
  data_type: 'call_recordings' | 'transcripts' | 'contact_data' | 'analytics' | 'logs'
  retention_days: number
  auto_delete: boolean
  encryption_required: boolean
  backup_required: boolean
  created_at: string
  updated_at: string
}

export interface DataProcessingConsent {
  id: string
  profile_id: string
  contact_id: string
  consent_type: 'processing' | 'storage' | 'marketing' | 'analytics' | 'third_party_sharing'
  granted: boolean
  consent_date: string
  expiry_date?: string
  withdrawal_date?: string
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests'
  purpose: string
  data_categories: string[]
  created_at: string
  updated_at: string
}

export interface DataSubjectRequest {
  id: string
  profile_id: string
  request_type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  contact_email: string
  contact_phone?: string
  subject_name: string
  request_details: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  response_due_date: string
  completed_at?: string
  response_notes?: string
  created_at: string
  updated_at: string
}

export interface SecurityAuditLog {
  id: string
  profile_id: string
  event_type: 'login' | 'logout' | 'data_access' | 'data_export' | 'settings_change' | 'api_access' | 'failed_login'
  user_id?: string
  ip_address: string
  user_agent: string
  resource_accessed?: string
  action_performed: string
  success: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
  created_at: string
}

export class PrivacySecurityService {
  private static encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production';

  // PII Encryption/Decryption
  static encryptPII(data: string, level: 'standard' | 'high' = 'standard'): string {
    try {
      if (level === 'high') {
        // Use AES-256 for high-level encryption
        return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
      } else {
        // Use Base64 encoding for standard level (for demo purposes)
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
      }
    } catch (error) {
      console.error('Error encrypting PII:', error);
      return data;
    }
  }

  static decryptPII(encryptedData: string, level: 'standard' | 'high' = 'standard'): string {
    try {
      if (level === 'high') {
        const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
      } else {
        return CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8);
      }
    } catch (error) {
      console.error('Error decrypting PII:', error);
      return encryptedData;
    }
  }

  // Mask sensitive data for display
  static maskPII(data: string, type: PIIField['field_type']): string {
    if (!data) return '';

    switch (type) {
      case 'phone':
        return data.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
      case 'email':
        const [username, domain] = data.split('@');
        if (username.length <= 2) return data;
        return `${username.substring(0, 2)}***@${domain}`;
      case 'name':
        const parts = data.split(' ');
        return parts.map(part => part.length > 1 ? `${part[0]}***` : part).join(' ');
      case 'ssn':
        return data.replace(/\d{3}-?\d{2}-?(\d{4})/, '***-**-$1');
      case 'credit_card':
        return data.replace(/\d{4}\s?\d{4}\s?\d{4}\s?(\d{4})/, '**** **** **** $1');
      case 'address':
        return data.replace(/\d+/, '***');
      default:
        return data.length > 4 ? `${data.substring(0, 2)}***${data.slice(-2)}` : '***';
    }
  }

  // Data retention management
  static async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<DataRetentionPolicy | null> {
    try {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .insert({
          ...policy,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating retention policy:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating retention policy:', error);
      return null;
    }
  }

  static async getRetentionPolicies(profileId: string): Promise<DataRetentionPolicy[]> {
    try {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching retention policies:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching retention policies:', error);
      return [];
    }
  }

  static async updateRetentionPolicy(policyId: string, updates: Partial<DataRetentionPolicy>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_retention_policies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', policyId);

      return !error;
    } catch (error) {
      console.error('Error updating retention policy:', error);
      return false;
    }
  }

  // Data processing consent management
  static async recordConsent(consent: Omit<DataProcessingConsent, 'id' | 'created_at' | 'updated_at'>): Promise<DataProcessingConsent | null> {
    try {
      const { data, error } = await supabase
        .from('data_processing_consents')
        .insert({
          ...consent,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording consent:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording consent:', error);
      return null;
    }
  }

  static async getConsents(profileId: string, contactId?: string): Promise<DataProcessingConsent[]> {
    try {
      let query = supabase
        .from('data_processing_consents')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching consents:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching consents:', error);
      return [];
    }
  }

  static async withdrawConsent(consentId: string, _withdrawalReason?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_processing_consents')
        .update({
          granted: false,
          withdrawal_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', consentId);

      return !error;
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      return false;
    }
  }

  // Data subject requests (GDPR/CCPA)
  static async createDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'created_at' | 'updated_at' | 'response_due_date'>): Promise<DataSubjectRequest | null> {
    try {
      // Calculate response due date (30 days for GDPR)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data, error } = await supabase
        .from('data_subject_requests')
        .insert({
          ...request,
          response_due_date: dueDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating data subject request:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating data subject request:', error);
      return null;
    }
  }

  static async getDataSubjectRequests(profileId: string, status?: string): Promise<DataSubjectRequest[]> {
    try {
      let query = supabase
        .from('data_subject_requests')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching data subject requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching data subject requests:', error);
      return [];
    }
  }

  static async updateDataSubjectRequest(requestId: string, updates: Partial<DataSubjectRequest>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('data_subject_requests')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return !error;
    } catch (error) {
      console.error('Error updating data subject request:', error);
      return false;
    }
  }

  // Generate data export for portability requests
  static async generateDataExport(profileId: string, contactId?: string): Promise<{
    personal_data: any
    call_history: any[]
    consents: any[]
    export_date: string
  } | null> {
    try {
      // Get personal data
      let personalDataQuery = supabase
        .from('campaign_leads')
        .select('*')
        .eq('profile_id', profileId);

      if (contactId) {
        personalDataQuery = personalDataQuery.eq('id', contactId);
      }

      const { data: personalData } = await personalDataQuery;

      // Get call history
      let callHistoryQuery = supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', profileId);

      if (contactId) {
        // Assuming we can link calls to contacts via phone number
        const contact = personalData?.[0];
        if (contact?.phone_number) {
          callHistoryQuery = callHistoryQuery.eq('phone_number_to', contact.phone_number);
        }
      }

      const { data: callHistory } = await callHistoryQuery;

      // Get consents
      let consentsQuery = supabase
        .from('data_processing_consents')
        .select('*')
        .eq('profile_id', profileId);

      if (contactId) {
        consentsQuery = consentsQuery.eq('contact_id', contactId);
      }

      const { data: consents } = await consentsQuery;

      return {
        personal_data: personalData || [],
        call_history: callHistory || [],
        consents: consents || [],
        export_date: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating data export:', error);
      return null;
    }
  }

  // Security audit logging
  static async logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'created_at'>): Promise<void> {
    try {
      await supabase
        .from('security_audit_logs')
        .insert(event);

      // Alert on high-risk events
      if (event.risk_level === 'high' || event.risk_level === 'critical') {
        // Send security alert notification
        console.warn('High-risk security event:', event);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  static async getSecurityAuditLogs(profileId: string, limit = 100, riskLevel?: string): Promise<SecurityAuditLog[]> {
    try {
      let query = supabase
        .from('security_audit_logs')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (riskLevel) {
        query = query.eq('risk_level', riskLevel);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching security audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching security audit logs:', error);
      return [];
    }
  }

  // Data anonymization
  static anonymizeData(data: Record<string, any>, piiFields: PIIField[]): Record<string, any> {
    const anonymized = { ...data };

    piiFields.forEach(field => {
      if (anonymized[field.field_name]) {
        switch (field.field_type) {
          case 'name':
            anonymized[field.field_name] = 'Anonymous User';
            break;
          case 'email':
            anonymized[field.field_name] = 'anonymous@example.com';
            break;
          case 'phone':
            anonymized[field.field_name] = '+1-XXX-XXX-XXXX';
            break;
          case 'address':
            anonymized[field.field_name] = 'Anonymous Address';
            break;
          default:
            anonymized[field.field_name] = '[REDACTED]';
        }
      }
    });

    return anonymized;
  }

  // Data deletion (right to erasure)
  static async deletePersonalData(profileId: string, contactId: string): Promise<{
    success: boolean
    deletedRecords: number
    errors: string[]
  }> {
    const errors: string[] = [];
    let deletedRecords = 0;

    try {
      // Delete from campaign_leads
      const { error: leadsError, count: leadsCount } = await supabase
        .from('campaign_leads')
        .delete({ count: 'exact' })
        .eq('profile_id', profileId)
        .eq('id', contactId);

      if (leadsError) {
        errors.push(`Error deleting leads: ${leadsError.message}`);
      } else {
        deletedRecords += leadsCount || 0;
      }

      // Delete consents
      const { error: consentsError, count: consentsCount } = await supabase
        .from('data_processing_consents')
        .delete({ count: 'exact' })
        .eq('profile_id', profileId)
        .eq('contact_id', contactId);

      if (consentsError) {
        errors.push(`Error deleting consents: ${consentsError.message}`);
      } else {
        deletedRecords += consentsCount || 0;
      }

      // Anonymize call logs instead of deleting (for compliance)
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', profileId)
        .eq('phone_number_to', contactId); // Assuming contactId could be phone number

      if (callLogs) {
        for (const log of callLogs) {
          const anonymizedLog = this.anonymizeData(log, [
            { field_name: 'phone_number_to', field_type: 'phone', encryption_level: 'none' },
            { field_name: 'transcript', field_type: 'custom', encryption_level: 'none' }
          ]);

          await supabase
            .from('call_logs')
            .update(anonymizedLog)
            .eq('id', log.id);
        }
        deletedRecords += callLogs.length;
      }

      return {
        success: errors.length === 0,
        deletedRecords,
        errors
      };
    } catch (error) {
      return {
        success: false,
        deletedRecords,
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Privacy compliance check
  static async checkPrivacyCompliance(profileId: string): Promise<{
    compliant: boolean
    issues: string[]
    recommendations: string[]
    score: number
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if retention policies are set
      const retentionPolicies = await this.getRetentionPolicies(profileId);
      if (retentionPolicies.length === 0) {
        issues.push('No data retention policies configured');
        recommendations.push('Set up data retention policies for different data types');
      }

      // Check for expired data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: oldData } = await supabase
        .from('call_logs')
        .select('id')
        .eq('profile_id', profileId)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .limit(1);

      if (oldData && oldData.length > 0) {
        issues.push('Old data found that may need review for retention compliance');
        recommendations.push('Review and clean up old data according to retention policies');
      }

      // Check for pending data subject requests
      const pendingRequests = await this.getDataSubjectRequests(profileId, 'pending');
      if (pendingRequests.length > 0) {
        issues.push(`${pendingRequests.length} pending data subject requests`);
        recommendations.push('Process pending data subject requests within required timeframes');
      }

      // Check for overdue requests
      const overdueRequests = pendingRequests.filter(req => 
        new Date(req.response_due_date) < new Date()
      );
      if (overdueRequests.length > 0) {
        issues.push(`${overdueRequests.length} overdue data subject requests`);
        recommendations.push('Immediately address overdue data subject requests');
      }

      // Calculate compliance score
      const totalChecks = 4;
      const passedChecks = totalChecks - issues.length;
      const score = Math.round((passedChecks / totalChecks) * 100);

      return {
        compliant: issues.length === 0,
        issues,
        recommendations,
        score
      };
    } catch (error) {
      console.error('Error checking privacy compliance:', error);
      return {
        compliant: false,
        issues: ['Error checking compliance'],
        recommendations: ['Review system configuration'],
        score: 0
      };
    }
  }

  // Create default retention policies
  static async createDefaultRetentionPolicies(profileId: string): Promise<void> {
    const defaultPolicies: Omit<DataRetentionPolicy, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        profile_id: profileId,
        data_type: 'call_recordings',
        retention_days: 365,
        auto_delete: true,
        encryption_required: true,
        backup_required: false
      },
      {
        profile_id: profileId,
        data_type: 'transcripts',
        retention_days: 730,
        auto_delete: true,
        encryption_required: true,
        backup_required: true
      },
      {
        profile_id: profileId,
        data_type: 'contact_data',
        retention_days: 1095, // 3 years
        auto_delete: false,
        encryption_required: true,
        backup_required: true
      },
      {
        profile_id: profileId,
        data_type: 'analytics',
        retention_days: 1095,
        auto_delete: true,
        encryption_required: false,
        backup_required: false
      },
      {
        profile_id: profileId,
        data_type: 'logs',
        retention_days: 90,
        auto_delete: true,
        encryption_required: false,
        backup_required: false
      }
    ];

    try {
      await supabase
        .from('data_retention_policies')
        .insert(defaultPolicies.map(policy => ({
          ...policy,
          updated_at: new Date().toISOString()
        })));
    } catch (error) {
      console.error('Error creating default retention policies:', error);
    }
  }
}
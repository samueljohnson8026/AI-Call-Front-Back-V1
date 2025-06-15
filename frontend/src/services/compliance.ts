import { supabase } from '../lib/supabase';

export interface DNCEntry {
  id: string
  profile_id: string
  phone_number: string
  reason: 'customer_request' | 'compliance' | 'invalid_number' | 'other'
  source: 'manual' | 'ai_agent' | 'import' | 'api'
  notes?: string
  added_by: string
  call_id?: string
  created_at: string
}

export interface TCPAConsent {
  id: string
  profile_id: string
  phone_number: string
  consent_type: 'express_written' | 'express_oral' | 'prior_business_relationship'
  consent_date: string
  consent_method: 'website_form' | 'phone_call' | 'email' | 'sms' | 'paper_form'
  consent_text?: string
  recording_url?: string
  ip_address?: string
  user_agent?: string
  witness?: string
  expires_at?: string
  revoked_at?: string
  revocation_reason?: string
  created_at: string
  updated_at: string
}

export interface ComplianceRule {
  id: string
  profile_id: string
  rule_type: 'calling_hours' | 'frequency_limit' | 'dnc_check' | 'consent_verification' | 'recording_disclosure'
  name: string
  description: string
  enabled: boolean
  parameters: Record<string, any>
  priority: number
  created_at: string
  updated_at: string
}

export interface ComplianceViolation {
  id: string
  profile_id: string
  violation_type: 'dnc_violation' | 'calling_hours_violation' | 'frequency_violation' | 'consent_violation' | 'disclosure_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  phone_number?: string
  call_id?: string
  campaign_id?: string
  rule_id?: string
  auto_resolved: boolean
  resolved_at?: string
  resolution_notes?: string
  created_at: string
}

export interface ComplianceReport {
  id: string
  profile_id: string
  report_type: 'monthly' | 'quarterly' | 'annual' | 'custom'
  period_start: string
  period_end: string
  total_calls: number
  compliant_calls: number
  violations: {
    dnc_violations: number
    calling_hours_violations: number
    frequency_violations: number
    consent_violations: number
    disclosure_violations: number
  }
  compliance_score: number
  recommendations: string[]
  generated_at: string
}

export class ComplianceService {
  // Check if phone number is on DNC list
  static async isDNCListed(profileId: string, phoneNumber: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('dnc_lists')
        .select('id')
        .eq('profile_id', profileId)
        .eq('phone_number', phoneNumber)
        .limit(1);

      if (error) {
        console.error('Error checking DNC list:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking DNC list:', error);
      return false;
    }
  }

  // Add phone number to DNC list
  static async addToDNC(entry: Omit<DNCEntry, 'id' | 'created_at'>): Promise<DNCEntry | null> {
    try {
      const { data, error } = await supabase
        .from('dnc_lists')
        .insert(entry)
        .select()
        .single();

      if (error) {
        console.error('Error adding to DNC list:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error adding to DNC list:', error);
      return null;
    }
  }

  // Remove phone number from DNC list
  static async removeFromDNC(profileId: string, phoneNumber: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('dnc_lists')
        .delete()
        .eq('profile_id', profileId)
        .eq('phone_number', phoneNumber);

      return !error;
    } catch (error) {
      console.error('Error removing from DNC list:', error);
      return false;
    }
  }

  // Get DNC list
  static async getDNCList(profileId: string, limit = 100, offset = 0): Promise<DNCEntry[]> {
    try {
      const { data, error } = await supabase
        .from('dnc_lists')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching DNC list:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching DNC list:', error);
      return [];
    }
  }

  // Check TCPA consent
  static async hasValidConsent(profileId: string, phoneNumber: string): Promise<{
    hasConsent: boolean
    consent?: TCPAConsent
    reason?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('tcpa_consents')
        .select('*')
        .eq('profile_id', profileId)
        .eq('phone_number', phoneNumber)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking TCPA consent:', error);
        return { hasConsent: false, reason: 'Database error' };
      }

      if (!data || data.length === 0) {
        return { hasConsent: false, reason: 'No consent record found' };
      }

      const consent = data[0];

      // Check if consent has expired
      if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
        return { hasConsent: false, reason: 'Consent has expired' };
      }

      return { hasConsent: true, consent };
    } catch (error) {
      console.error('Error checking TCPA consent:', error);
      return { hasConsent: false, reason: 'Unknown error' };
    }
  }

  // Record TCPA consent
  static async recordConsent(consent: Omit<TCPAConsent, 'id' | 'created_at' | 'updated_at'>): Promise<TCPAConsent | null> {
    try {
      const { data, error } = await supabase
        .from('tcpa_consents')
        .insert({
          ...consent,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording TCPA consent:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error recording TCPA consent:', error);
      return null;
    }
  }

  // Revoke TCPA consent
  static async revokeConsent(profileId: string, phoneNumber: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tcpa_consents')
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId)
        .eq('phone_number', phoneNumber)
        .is('revoked_at', null);

      return !error;
    } catch (error) {
      console.error('Error revoking TCPA consent:', error);
      return false;
    }
  }

  // Check calling hours compliance
  static isWithinCallingHours(timezone: string, allowedHours = { start: 8, end: 21 }): boolean {
    try {
      const now = new Date();
      const currentHour = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getHours();
      
      return currentHour >= allowedHours.start && currentHour < allowedHours.end;
    } catch (error) {
      console.error('Error checking calling hours:', error);
      return false;
    }
  }

  // Check frequency limits
  static async checkFrequencyLimit(profileId: string, phoneNumber: string, limitPeriod = 24, maxCalls = 3): Promise<{
    withinLimit: boolean
    callCount: number
    nextAllowedTime?: string
  }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - limitPeriod);

      const { data, error } = await supabase
        .from('call_logs')
        .select('created_at')
        .eq('profile_id', profileId)
        .eq('phone_number_to', phoneNumber)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking frequency limit:', error);
        return { withinLimit: true, callCount: 0 };
      }

      const callCount = data?.length || 0;
      const withinLimit = callCount < maxCalls;

      let nextAllowedTime: string | undefined;
      if (!withinLimit && data && data.length > 0) {
        const oldestCall = new Date(data[data.length - 1].created_at);
        oldestCall.setHours(oldestCall.getHours() + limitPeriod);
        nextAllowedTime = oldestCall.toISOString();
      }

      return { withinLimit, callCount, nextAllowedTime };
    } catch (error) {
      console.error('Error checking frequency limit:', error);
      return { withinLimit: true, callCount: 0 };
    }
  }

  // Validate call compliance before making call
  static async validateCallCompliance(profileId: string, phoneNumber: string, timezone: string): Promise<{
    compliant: boolean
    violations: string[]
    warnings: string[]
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // Check DNC list
      const isDNC = await this.isDNCListed(profileId, phoneNumber);
      if (isDNC) {
        violations.push('Phone number is on Do Not Call list');
      }

      // Check TCPA consent
      const consentCheck = await this.hasValidConsent(profileId, phoneNumber);
      if (!consentCheck.hasConsent) {
        violations.push(`TCPA consent required: ${consentCheck.reason}`);
      }

      // Check calling hours
      if (!this.isWithinCallingHours(timezone)) {
        violations.push('Outside allowed calling hours (8 AM - 9 PM local time)');
      }

      // Check frequency limits
      const frequencyCheck = await this.checkFrequencyLimit(profileId, phoneNumber);
      if (!frequencyCheck.withinLimit) {
        violations.push(`Frequency limit exceeded (${frequencyCheck.callCount} calls in last 24 hours)`);
      }

      // Add warnings for edge cases
      if (consentCheck.consent?.expires_at) {
        const expiryDate = new Date(consentCheck.consent.expires_at);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          warnings.push(`TCPA consent expires in ${daysUntilExpiry} days`);
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      console.error('Error validating call compliance:', error);
      return {
        compliant: false,
        violations: ['Error validating compliance'],
        warnings: []
      };
    }
  }

  // Log compliance violation
  static async logViolation(violation: Omit<ComplianceViolation, 'id' | 'created_at'>): Promise<ComplianceViolation | null> {
    try {
      const { data, error } = await supabase
        .from('compliance_violations')
        .insert(violation)
        .select()
        .single();

      if (error) {
        console.error('Error logging compliance violation:', error);
        return null;
      }

      // Send notification for high/critical violations
      if (violation.severity === 'high' || violation.severity === 'critical') {
        // Import notification service and send alert
        // NotificationService.notifyComplianceWarning(violation.profile_id, ...)
      }

      return data;
    } catch (error) {
      console.error('Error logging compliance violation:', error);
      return null;
    }
  }

  // Get compliance violations
  static async getViolations(profileId: string, limit = 50, severity?: string): Promise<ComplianceViolation[]> {
    try {
      let query = supabase
        .from('compliance_violations')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching compliance violations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching compliance violations:', error);
      return [];
    }
  }

  // Generate compliance report
  static async generateComplianceReport(profileId: string, periodStart: string, periodEnd: string): Promise<ComplianceReport | null> {
    try {
      // Get total calls in period
      const { data: callLogs, error: callError } = await supabase
        .from('call_logs')
        .select('id, phone_number_to')
        .eq('profile_id', profileId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      if (callError) {
        console.error('Error fetching call logs for report:', callError);
        return null;
      }

      const totalCalls = callLogs?.length || 0;

      // Get violations in period
      const { data: violations, error: violationError } = await supabase
        .from('compliance_violations')
        .select('violation_type')
        .eq('profile_id', profileId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      if (violationError) {
        console.error('Error fetching violations for report:', violationError);
        return null;
      }

      // Count violations by type
      const violationCounts = {
        dnc_violations: 0,
        calling_hours_violations: 0,
        frequency_violations: 0,
        consent_violations: 0,
        disclosure_violations: 0
      };

      violations?.forEach(v => {
        if (v.violation_type in violationCounts) {
          violationCounts[v.violation_type as keyof typeof violationCounts]++;
        }
      });

      const totalViolations = Object.values(violationCounts).reduce((sum, count) => sum + count, 0);
      const compliantCalls = totalCalls - totalViolations;
      const complianceScore = totalCalls > 0 ? Math.round((compliantCalls / totalCalls) * 100) : 100;

      // Generate recommendations
      const recommendations: string[] = [];
      if (violationCounts.dnc_violations > 0) {
        recommendations.push('Review and update DNC list screening procedures');
      }
      if (violationCounts.calling_hours_violations > 0) {
        recommendations.push('Implement stricter calling hours controls');
      }
      if (violationCounts.frequency_violations > 0) {
        recommendations.push('Review frequency limit settings and enforcement');
      }
      if (violationCounts.consent_violations > 0) {
        recommendations.push('Improve TCPA consent collection and verification processes');
      }
      if (complianceScore < 95) {
        recommendations.push('Consider additional compliance training for staff');
      }

      const report: Omit<ComplianceReport, 'id'> = {
        profile_id: profileId,
        report_type: 'custom',
        period_start: periodStart,
        period_end: periodEnd,
        total_calls: totalCalls,
        compliant_calls: compliantCalls,
        violations: violationCounts,
        compliance_score: complianceScore,
        recommendations,
        generated_at: new Date().toISOString()
      };

      // Save report
      const { data, error } = await supabase
        .from('compliance_reports')
        .insert(report)
        .select()
        .single();

      if (error) {
        console.error('Error saving compliance report:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return null;
    }
  }

  // Get compliance rules
  static async getComplianceRules(profileId: string): Promise<ComplianceRule[]> {
    try {
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .eq('profile_id', profileId)
        .order('priority', { ascending: true });

      if (error) {
        console.error('Error fetching compliance rules:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching compliance rules:', error);
      return [];
    }
  }

  // Create default compliance rules for new users
  static async createDefaultRules(profileId: string): Promise<void> {
    const defaultRules: Omit<ComplianceRule, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        profile_id: profileId,
        rule_type: 'dnc_check',
        name: 'Do Not Call List Check',
        description: 'Check phone numbers against DNC list before calling',
        enabled: true,
        parameters: { strict_mode: true },
        priority: 1
      },
      {
        profile_id: profileId,
        rule_type: 'calling_hours',
        name: 'Calling Hours Restriction',
        description: 'Only allow calls between 8 AM and 9 PM local time',
        enabled: true,
        parameters: { start_hour: 8, end_hour: 21 },
        priority: 2
      },
      {
        profile_id: profileId,
        rule_type: 'frequency_limit',
        name: 'Call Frequency Limit',
        description: 'Limit calls to same number to 3 per 24 hours',
        enabled: true,
        parameters: { max_calls: 3, period_hours: 24 },
        priority: 3
      },
      {
        profile_id: profileId,
        rule_type: 'consent_verification',
        name: 'TCPA Consent Verification',
        description: 'Verify TCPA consent before making calls',
        enabled: true,
        parameters: { require_express_consent: true },
        priority: 4
      },
      {
        profile_id: profileId,
        rule_type: 'recording_disclosure',
        name: 'Call Recording Disclosure',
        description: 'Disclose call recording at beginning of calls',
        enabled: true,
        parameters: { disclosure_text: 'This call may be recorded for quality assurance purposes.' },
        priority: 5
      }
    ];

    try {
      const { error } = await supabase
        .from('compliance_rules')
        .insert(defaultRules.map(rule => ({
          ...rule,
          updated_at: new Date().toISOString()
        })));

      if (error) {
        console.error('Error creating default compliance rules:', error);
      }
    } catch (error) {
      console.error('Error creating default compliance rules:', error);
    }
  }

  // Update compliance rule
  static async updateRule(ruleId: string, updates: Partial<ComplianceRule>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('compliance_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId);

      return !error;
    } catch (error) {
      console.error('Error updating compliance rule:', error);
      return false;
    }
  }

  // Get compliance dashboard data
  static async getComplianceDashboard(profileId: string): Promise<{
    totalCalls: number
    compliantCalls: number
    complianceScore: number
    recentViolations: ComplianceViolation[]
    dncListSize: number
    consentRecords: number
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get call stats
      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('id')
        .eq('profile_id', profileId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalCalls = callLogs?.length || 0;

      // Get violations
      const { data: violations } = await supabase
        .from('compliance_violations')
        .select('*')
        .eq('profile_id', profileId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      const violationCount = violations?.length || 0;
      const compliantCalls = totalCalls - violationCount;
      const complianceScore = totalCalls > 0 ? Math.round((compliantCalls / totalCalls) * 100) : 100;

      // Get DNC list size
      const { count: dncCount } = await supabase
        .from('dnc_lists')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      // Get consent records count
      const { count: consentCount } = await supabase
        .from('tcpa_consents')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('revoked_at', null);

      return {
        totalCalls,
        compliantCalls,
        complianceScore,
        recentViolations: violations || [],
        dncListSize: dncCount || 0,
        consentRecords: consentCount || 0
      };
    } catch (error) {
      console.error('Error fetching compliance dashboard data:', error);
      return {
        totalCalls: 0,
        compliantCalls: 0,
        complianceScore: 100,
        recentViolations: [],
        dncListSize: 0,
        consentRecords: 0
      };
    }
  }
}
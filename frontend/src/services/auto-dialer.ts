import { DatabaseService } from './database';
import { RealtimeService } from './realtime';
import type { CampaignLead } from '../lib/supabase';

interface DialerConfig {
  campaignId: string
  maxConcurrentCalls: number
  callTimeoutSeconds: number
  retryAttempts: number
  retryDelayMinutes: number
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  timezone: string
  daysOfWeek: number[] // 0=Sunday, 1=Monday, etc.
  dialingRate: number // calls per minute
}

// Using CampaignLead from supabase types instead of custom interface

interface ActiveCall {
  id: string
  leadId: string
  phoneNumber: string
  startedAt: string
  agentId: string
  status: 'dialing' | 'ringing' | 'connected' | 'completed' | 'failed'
}

export class AutoDialerEngine {
  private campaignId: string;
  private config: DialerConfig;
  private isRunning: boolean = false;
  private activeCalls: Map<string, ActiveCall> = new Map();
  private dialingQueue: CampaignLead[] = [];
  private dialingInterval?: NodeJS.Timeout;
  private statusCheckInterval?: NodeJS.Timeout;
  private userId: string;

  constructor(campaignId: string, config: DialerConfig, userId: string) {
    this.campaignId = campaignId;
    this.config = config;
    this.userId = userId;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Auto-dialer is already running');
    }

    console.log(`Starting auto-dialer for campaign ${this.campaignId}`);
    this.isRunning = true;

    // Load leads to call
    await this.loadDialingQueue();

    // Start dialing process
    this.startDialing();

    // Start status monitoring
    this.startStatusMonitoring();

    // Subscribe to real-time updates
    this.subscribeToUpdates();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`Stopping auto-dialer for campaign ${this.campaignId}`);
    this.isRunning = false;

    // Clear intervals
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
    }
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    // Hang up active calls
    await this.hangupActiveCalls();

    // Update campaign status
    await DatabaseService.updateCampaign(this.campaignId, {
      status: 'paused'
    });
  }

  async pause(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log(`Pausing auto-dialer for campaign ${this.campaignId}`);
    
    // Stop new calls but keep monitoring active ones
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = undefined;
    }

    await DatabaseService.updateCampaign(this.campaignId, {
      status: 'paused'
    });
  }

  async resume(): Promise<void> {
    if (!this.isRunning) {
      await this.start();
      return;
    }

    console.log(`Resuming auto-dialer for campaign ${this.campaignId}`);
    
    // Restart dialing if not already running
    if (!this.dialingInterval) {
      this.startDialing();
    }

    await DatabaseService.updateCampaign(this.campaignId, {
      status: 'active'
    });
  }

  private async loadDialingQueue(): Promise<void> {
    try {
      // Get leads that need to be called
      const leads = await DatabaseService.getCampaignLeads(this.campaignId, {
        status: ['pending', 'retry'],
        limit: 1000
      });

      // Filter and prioritize leads
      this.dialingQueue = leads
        .filter(lead => this.shouldCallLead(lead))
        .sort((a, b) => {
          // Sort by priority, then by last call attempt
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const aPriority = priorityOrder[a.priority] || 2;
          const bPriority = priorityOrder[b.priority] || 2;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          
          // If same priority, call older attempts first
          const aLastCall = a.last_call_at ? new Date(a.last_call_at).getTime() : 0;
          const bLastCall = b.last_call_at ? new Date(b.last_call_at).getTime() : 0;
          return aLastCall - bLastCall;
        });

      console.log(`Loaded ${this.dialingQueue.length} leads for dialing`);
    } catch (error) {
      console.error('Error loading dialing queue:', error);
      throw error;
    }
  }

  private shouldCallLead(lead: CampaignLead): boolean {
    // Check if lead has exceeded retry attempts
    if ((lead.call_attempts || 0) >= this.config.retryAttempts) {
      return false;
    }

    // Check if enough time has passed since last call attempt
    if (lead.last_call_at) {
      const lastCallTime = new Date(lead.last_call_at).getTime();
      const retryDelayMs = this.config.retryDelayMinutes * 60 * 1000;
      const now = Date.now();
      
      if (now - lastCallTime < retryDelayMs) {
        return false;
      }
    }

    // Check if current time is within calling hours
    if (!this.isWithinCallingHours()) {
      return false;
    }

    return true;
  }

  private isWithinCallingHours(): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Check if today is a calling day
    if (!this.config.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // Check if current time is within calling hours
    if (currentTime < this.config.startTime || currentTime > this.config.endTime) {
      return false;
    }

    return true;
  }

  private startDialing(): void {
    // Calculate interval based on dialing rate
    const intervalMs = (60 / this.config.dialingRate) * 1000;

    this.dialingInterval = setInterval(async () => {
      if (!this.isRunning || !this.isWithinCallingHours()) {
        return;
      }

      // Check if we can make more calls
      if (this.activeCalls.size >= this.config.maxConcurrentCalls) {
        return;
      }

      // Get next lead to call
      const lead = this.getNextLead();
      if (!lead) {
        console.log('No more leads to call');
        return;
      }

      // Initiate call
      await this.initiateCall(lead);
    }, intervalMs);
  }

  private getNextLead(): CampaignLead | null {
    // Remove leads that are no longer valid
    this.dialingQueue = this.dialingQueue.filter(lead => this.shouldCallLead(lead));
    
    return this.dialingQueue.shift() || null;
  }

  private async initiateCall(lead: CampaignLead): Promise<void> {
    try {
      console.log(`Initiating call to ${lead.phone_number} (${lead.first_name} ${lead.last_name})`);

      // Get campaign details for agent assignment
      const campaign = await DatabaseService.getCampaign(this.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Create call record
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const activeCall: ActiveCall = {
        id: callId,
        leadId: lead.id,
        phoneNumber: lead.phone_number,
        startedAt: new Date().toISOString(),
        agentId: campaign.agent_id || '',
        status: 'dialing'
      };

      this.activeCalls.set(callId, activeCall);

      // Update lead status
      await DatabaseService.updateCampaignLead(lead.id, {
        status: 'called',
        call_attempts: (lead.call_attempts || 0) + 1,
        last_call_at: activeCall.startedAt
      });

      // Create call log entry
      await DatabaseService.createCallLog({
        profile_id: this.userId,
        agent_id: campaign.agent_id,
        phone_number_from: campaign.caller_id || '',
        phone_number_to: lead.phone_number,
        direction: 'outbound',
        status: 'pending',
        started_at: activeCall.startedAt,
        duration_seconds: 0,
        priority: lead.priority || 'normal',
        follow_up_required: false,
        campaign_id: this.campaignId,
        lead_id: lead.id
      });

      // TODO: Integrate with Twilio to actually place the call
      // For now, simulate call progression
      this.simulateCallProgression(activeCall);

    } catch (error) {
      console.error('Error initiating call:', error);
      
      // Update lead status to failed
      await DatabaseService.updateCampaignLead(lead.id, {
        status: 'failed',
        outcome: 'dialer_error'
      });
    }
  }

  private simulateCallProgression(call: ActiveCall): void {
    // Simulate call states for demo purposes
    // In production, this would be handled by Twilio webhooks
    
    setTimeout(() => {
      call.status = 'ringing';
      this.activeCalls.set(call.id, call);
    }, 2000);

    setTimeout(() => {
      // Randomly determine call outcome
      const outcomes = ['answered', 'no_answer', 'busy', 'failed'];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      
      this.handleCallCompletion(call, outcome);
    }, 10000 + Math.random() * 20000); // 10-30 seconds
  }

  private async handleCallCompletion(call: ActiveCall, outcome: string): Promise<void> {
    try {
      const endTime = new Date().toISOString();
      const durationSeconds = Math.floor(
        (new Date(endTime).getTime() - new Date(call.startedAt).getTime()) / 1000
      );

      // Update call log
      await DatabaseService.updateCallLog(call.id, {
        status: outcome === 'answered' ? 'completed' : 'failed',
        ended_at: endTime,
        duration_seconds: durationSeconds,
        outcome: outcome
      });

      // Update lead status
      const leadStatus = outcome === 'answered' ? 'completed' : 'failed';
      await DatabaseService.updateCampaignLead(call.leadId, {
        status: leadStatus,
        outcome: outcome
      });

      // Update campaign statistics
      await this.updateCampaignStats(outcome);

      // Remove from active calls
      this.activeCalls.delete(call.id);

      console.log(`Call completed: ${call.phoneNumber} - ${outcome}`);
    } catch (error) {
      console.error('Error handling call completion:', error);
    }
  }

  private async updateCampaignStats(outcome: string): Promise<void> {
    try {
      const campaign = await DatabaseService.getCampaign(this.campaignId);
      if (!campaign) return;

      const updates: any = {
        leads_called: (campaign.leads_called || 0) + 1
      };

      if (outcome === 'answered') {
        updates.leads_answered = (campaign.leads_answered || 0) + 1;
      }

      if (outcome === 'answered' || outcome === 'completed') {
        updates.leads_completed = (campaign.leads_completed || 0) + 1;
      }

      await DatabaseService.updateCampaign(this.campaignId, updates);
    } catch (error) {
      console.error('Error updating campaign stats:', error);
    }
  }

  private startStatusMonitoring(): void {
    this.statusCheckInterval = setInterval(async () => {
      // Check for stuck calls and clean them up
      const now = Date.now();
      const timeoutMs = this.config.callTimeoutSeconds * 1000;

      for (const [, call] of this.activeCalls.entries()) {
        const callAge = now - new Date(call.startedAt).getTime();
        
        if (callAge > timeoutMs) {
          console.log(`Call timeout: ${call.phoneNumber}`);
          await this.handleCallCompletion(call, 'timeout');
        }
      }

      // Check if we should reload the queue
      if (this.dialingQueue.length < 10) {
        await this.loadDialingQueue();
      }
    }, 30000); // Check every 30 seconds
  }

  private subscribeToUpdates(): void {
    // Subscribe to campaign updates
    RealtimeService.subscribeToCampaignUpdates(
      this.userId,
      async (campaign) => {
        if (campaign.id === this.campaignId) {
          if (campaign.status === 'paused' && this.isRunning) {
            await this.pause();
          } else if (campaign.status === 'active' && !this.isRunning) {
            await this.resume();
          }
        }
      },
      () => {}, // onInsert
      () => {}  // onDelete
    );
  }

  private async hangupActiveCalls(): Promise<void> {
    const hangupPromises = Array.from(this.activeCalls.values()).map(call =>
      this.handleCallCompletion(call, 'cancelled')
    );
    
    await Promise.all(hangupPromises);
    this.activeCalls.clear();
  }

  // Public getters for monitoring
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeCalls: this.activeCalls.size,
      queuedLeads: this.dialingQueue.length,
      maxConcurrentCalls: this.config.maxConcurrentCalls,
      dialingRate: this.config.dialingRate,
      withinCallingHours: this.isWithinCallingHours()
    };
  }

  getActiveCalls() {
    return Array.from(this.activeCalls.values());
  }

  getQueuedLeads() {
    return [...this.dialingQueue];
  }
}
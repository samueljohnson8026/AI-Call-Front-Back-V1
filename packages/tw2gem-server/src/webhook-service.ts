import { createClient } from '@supabase/supabase-js';

interface CallEventData {
  call_id: string
  phone_number_from?: string
  phone_number_to?: string
  agent_id?: string
  direction?: 'inbound' | 'outbound'
  status?: string
  duration_seconds?: number
  outcome?: string
  transcript?: string
  function_calls?: any[]
  customer_satisfaction?: number
  timestamp: string
}

interface FunctionCallData {
  call_id: string
  function_name: string
  parameters: any
  result?: any
  timestamp: string
}

export class WebhookService {
  private supabase: any;
  
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async processCallEvent(eventType: string, data: CallEventData, userId?: string) {
    try {
      // Log the call event to database
      if (this.supabase && userId) {
        await this.logCallEvent(eventType, data, userId);
      }

      // Send webhook notifications
      await this.sendWebhookNotifications(eventType, data, userId);
      
      console.log(`Webhook event processed: ${eventType}`, data);
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  private async logCallEvent(eventType: string, data: CallEventData, userId: string) {
    try {
      switch (eventType) {
        case 'call.started':
          await this.supabase
            .from('call_logs')
            .insert({
              id: data.call_id,
              profile_id: userId,
              agent_id: data.agent_id,
              phone_number_from: data.phone_number_from,
              phone_number_to: data.phone_number_to,
              direction: data.direction,
              status: 'in_progress',
              started_at: data.timestamp
            });
          break;

        case 'call.completed':
          await this.supabase
            .from('call_logs')
            .update({
              status: 'completed',
              ended_at: data.timestamp,
              duration_seconds: data.duration_seconds,
              outcome: data.outcome,
              transcript: data.transcript,
              customer_satisfaction_score: data.customer_satisfaction
            })
            .eq('id', data.call_id);
          break;

        case 'call.failed':
          await this.supabase
            .from('call_logs')
            .update({
              status: 'failed',
              ended_at: data.timestamp,
              outcome: data.outcome || 'failed'
            })
            .eq('id', data.call_id);
          break;
      }
    } catch (error) {
      console.error('Error logging call event to database:', error);
    }
  }

  private async sendWebhookNotifications(eventType: string, data: CallEventData, userId?: string) {
    if (!this.supabase || !userId) return;

    try {
      // Get user's webhook endpoints
      const { data: webhooks, error } = await this.supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .contains('events', [eventType]);

      if (error) {
        console.error('Error fetching webhooks:', error);
        return;
      }

      // Send to each webhook endpoint
      for (const webhook of webhooks || []) {
        await this.sendWebhook(webhook, eventType, data);
      }
    } catch (error) {
      console.error('Error sending webhook notifications:', error);
    }
  }

  private async sendWebhook(webhook: any, eventType: string, data: CallEventData) {
    try {
      const payload = {
        event: eventType,
        data: data,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };

      const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'AI-Call-Center-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      });

      // Log delivery attempt
      await this.logWebhookDelivery(webhook.id, eventType, response.status, response.ok);

      if (!response.ok) {
        console.error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
      // Log failed delivery
      await this.logWebhookDelivery(webhook.id, eventType, 0, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async logWebhookDelivery(webhookId: string, eventType: string, statusCode: number, success: boolean, errorMessage?: string) {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhookId,
          event_type: eventType,
          status_code: statusCode,
          success: success,
          error_message: errorMessage,
          delivered_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging webhook delivery:', error);
    }
  }

  private generateSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  async processFunctionCall(data: FunctionCallData, userId?: string) {
    try {
      // Log function call event
      if (this.supabase && userId) {
        await this.logFunctionCall(data, userId);
      }

      // Send function call webhook
      await this.sendWebhookNotifications('function.called', {
        call_id: data.call_id,
        timestamp: data.timestamp
      } as CallEventData, userId);

      console.log('Function call processed:', data);
    } catch (error) {
      console.error('Error processing function call:', error);
    }
  }

  private async logFunctionCall(data: FunctionCallData, userId: string) {
    try {
      // Update call log with function call data
      const { data: callLog } = await this.supabase
        .from('call_logs')
        .select('function_calls')
        .eq('id', data.call_id)
        .single();

      const existingCalls = callLog?.function_calls || [];
      const updatedCalls = [...existingCalls, {
        function_name: data.function_name,
        parameters: data.parameters,
        result: data.result,
        timestamp: data.timestamp
      }];

      await this.supabase
        .from('call_logs')
        .update({ function_calls: updatedCalls })
        .eq('id', data.call_id);
    } catch (error) {
      console.error('Error logging function call:', error);
    }
  }
}
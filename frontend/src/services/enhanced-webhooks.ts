import CryptoJS from 'crypto-js';
import { supabase } from '../lib/supabase';

export interface WebhookEndpoint {
  id: string
  profile_id: string
  name: string
  url: string
  secret_key: string
  events: string[]
  active: boolean
  retry_config: {
    max_retries: number
    retry_delay_ms: number
    backoff_multiplier: number
    max_delay_ms: number
  }
  security_config: {
    verify_ssl: boolean
    timeout_ms: number
    custom_headers?: Record<string, string>
  }
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  endpoint_id: string
  event_type: string
  payload: Record<string, any>
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  attempt_count: number
  last_attempt_at?: string
  next_retry_at?: string
  response_status?: number
  response_body?: string
  error_message?: string
  delivered_at?: string
  created_at: string
}

export interface WebhookEvent {
  id: string
  profile_id: string
  event_type: string
  event_data: Record<string, any>
  source: string
  processed: boolean
  created_at: string
}

export interface WebhookStats {
  total_deliveries: number
  successful_deliveries: number
  failed_deliveries: number
  success_rate: number
  average_response_time: number
  last_24h_deliveries: number
  endpoints_count: number
  active_endpoints: number
}

export class EnhancedWebhookService {
  private static readonly DEFAULT_RETRY_CONFIG = {
    max_retries: 3,
    retry_delay_ms: 1000,
    backoff_multiplier: 2,
    max_delay_ms: 30000
  };

  private static readonly DEFAULT_SECURITY_CONFIG = {
    verify_ssl: true,
    timeout_ms: 10000
  };

  // Webhook Endpoint Management
  static async createWebhookEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'created_at' | 'updated_at' | 'secret_key'>): Promise<WebhookEndpoint | null> {
    try {
      // Generate secret key for webhook signing
      const secretKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          ...endpoint,
          secret_key: secretKey,
          retry_config: endpoint.retry_config || this.DEFAULT_RETRY_CONFIG,
          security_config: endpoint.security_config || this.DEFAULT_SECURITY_CONFIG,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating webhook endpoint:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating webhook endpoint:', error);
      return null;
    }
  }

  static async getWebhookEndpoints(profileId: string): Promise<WebhookEndpoint[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching webhook endpoints:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching webhook endpoints:', error);
      return [];
    }
  }

  static async updateWebhookEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', endpointId);

      return !error;
    } catch (error) {
      console.error('Error updating webhook endpoint:', error);
      return false;
    }
  }

  static async deleteWebhookEndpoint(endpointId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', endpointId);

      return !error;
    } catch (error) {
      console.error('Error deleting webhook endpoint:', error);
      return false;
    }
  }

  // Webhook Delivery
  static async deliverWebhook(endpointId: string, eventType: string, payload: Record<string, any>): Promise<WebhookDelivery | null> {
    try {
      // Get endpoint configuration
      const { data: endpoint, error: endpointError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', endpointId)
        .single();

      if (endpointError || !endpoint || !endpoint.active) {
        console.error('Webhook endpoint not found or inactive:', endpointError);
        return null;
      }

      // Check if endpoint is subscribed to this event type
      if (!endpoint.events.includes(eventType) && !endpoint.events.includes('*')) {
        console.log(`Endpoint ${endpointId} not subscribed to event ${eventType}`);
        return null;
      }

      // Create delivery record
      const delivery = await this.createDeliveryRecord(endpointId, eventType, payload);
      if (!delivery) return null;

      // Attempt delivery
      await this.attemptDelivery(delivery, endpoint);

      return delivery;
    } catch (error) {
      console.error('Error delivering webhook:', error);
      return null;
    }
  }

  private static async createDeliveryRecord(endpointId: string, eventType: string, payload: Record<string, any>): Promise<WebhookDelivery | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .insert({
          endpoint_id: endpointId,
          event_type: eventType,
          payload,
          status: 'pending',
          attempt_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating delivery record:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating delivery record:', error);
      return null;
    }
  }

  private static async attemptDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint): Promise<void> {
    try {
      // const startTime = Date.now()
      
      // Prepare payload with metadata
      const webhookPayload = {
        id: delivery.id,
        event_type: delivery.event_type,
        created_at: delivery.created_at,
        data: delivery.payload
      };

      // Generate signature
      const signature = this.generateSignature(JSON.stringify(webhookPayload), endpoint.secret_key);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery': delivery.id,
        'User-Agent': 'AI-Calling-Webhook/1.0',
        ...endpoint.security_config.custom_headers
      };

      // Make HTTP request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.security_config.timeout_ms);

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // const responseTime = Date.now() - startTime
        const responseBody = await response.text();

        // Update delivery record
        if (response.ok) {
          await this.updateDeliveryStatus(delivery.id, {
            status: 'delivered',
            response_status: response.status,
            response_body: responseBody.substring(0, 1000), // Limit response body size
            delivered_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString()
          });
        } else {
          await this.handleFailedDelivery(delivery, endpoint, response.status, responseBody);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        await this.handleFailedDelivery(delivery, endpoint, 0, fetchError instanceof Error ? fetchError.message : 'Unknown error');
      }
    } catch (error) {
      console.error('Error attempting webhook delivery:', error);
      await this.handleFailedDelivery(delivery, endpoint, 0, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static async handleFailedDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint, statusCode: number, errorMessage: string): Promise<void> {
    const attemptCount = delivery.attempt_count + 1;
    const maxRetries = endpoint.retry_config.max_retries;

    if (attemptCount < maxRetries) {
      // Schedule retry
      const delay = Math.min(
        endpoint.retry_config.retry_delay_ms * Math.pow(endpoint.retry_config.backoff_multiplier, attemptCount - 1),
        endpoint.retry_config.max_delay_ms
      );
      
      const nextRetryAt = new Date(Date.now() + delay);

      await this.updateDeliveryStatus(delivery.id, {
        status: 'retrying',
        attempt_count: attemptCount,
        response_status: statusCode,
        error_message: errorMessage,
        next_retry_at: nextRetryAt.toISOString(),
        last_attempt_at: new Date().toISOString()
      });

      // Schedule retry (in a real implementation, you'd use a job queue)
      setTimeout(() => {
        this.retryDelivery(delivery.id);
      }, delay);
    } else {
      // Mark as failed
      await this.updateDeliveryStatus(delivery.id, {
        status: 'failed',
        attempt_count: attemptCount,
        response_status: statusCode,
        error_message: errorMessage,
        last_attempt_at: new Date().toISOString()
      });
    }
  }

  private static async updateDeliveryStatus(deliveryId: string, updates: Partial<WebhookDelivery>): Promise<void> {
    try {
      await supabase
        .from('webhook_deliveries')
        .update(updates)
        .eq('id', deliveryId);
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  private static async retryDelivery(deliveryId: string): Promise<void> {
    try {
      // Get delivery and endpoint
      const { data: delivery } = await supabase
        .from('webhook_deliveries')
        .select('*, webhook_endpoints(*)')
        .eq('id', deliveryId)
        .single();

      if (delivery && delivery.webhook_endpoints) {
        await this.attemptDelivery(delivery, delivery.webhook_endpoints);
      }
    } catch (error) {
      console.error('Error retrying delivery:', error);
    }
  }

  // Signature Generation and Verification
  private static generateSignature(payload: string, secret: string): string {
    return CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
  }

  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }

  // Event Management
  static async createWebhookEvent(event: Omit<WebhookEvent, 'id' | 'created_at'>): Promise<WebhookEvent | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .insert(event)
        .select()
        .single();

      if (error) {
        console.error('Error creating webhook event:', error);
        return null;
      }

      // Process event for all relevant endpoints
      await this.processWebhookEvent(data);

      return data;
    } catch (error) {
      console.error('Error creating webhook event:', error);
      return null;
    }
  }

  private static async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      // Get all active endpoints for this profile that subscribe to this event
      const { data: endpoints } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', event.profile_id)
        .eq('active', true);

      if (!endpoints) return;

      // Filter endpoints that subscribe to this event type
      const relevantEndpoints = endpoints.filter(endpoint =>
        endpoint.events.includes(event.event_type) || endpoint.events.includes('*')
      );

      // Deliver to all relevant endpoints
      const deliveryPromises = relevantEndpoints.map(endpoint =>
        this.deliverWebhook(endpoint.id, event.event_type, event.event_data)
      );

      await Promise.allSettled(deliveryPromises);

      // Mark event as processed
      await supabase
        .from('webhook_events')
        .update({ processed: true })
        .eq('id', event.id);
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  // Analytics and Monitoring
  static async getWebhookStats(profileId: string, timeRange?: { start: string; end: string }): Promise<WebhookStats> {
    try {
      let deliveryQuery = supabase
        .from('webhook_deliveries')
        .select('*, webhook_endpoints!inner(profile_id)')
        .eq('webhook_endpoints.profile_id', profileId);

      if (timeRange) {
        deliveryQuery = deliveryQuery
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end);
      }

      const { data: deliveries } = await deliveryQuery;

      const totalDeliveries = deliveries?.length || 0;
      const successfulDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
      const failedDeliveries = deliveries?.filter(d => d.status === 'failed').length || 0;
      const successRate = totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0;

      // Get last 24h deliveries
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data: recentDeliveries } = await supabase
        .from('webhook_deliveries')
        .select('*, webhook_endpoints!inner(profile_id)')
        .eq('webhook_endpoints.profile_id', profileId)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      // Get endpoint counts
      const { data: endpoints } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', profileId);

      const endpointsCount = endpoints?.length || 0;
      const activeEndpoints = endpoints?.filter(e => e.active).length || 0;

      return {
        total_deliveries: totalDeliveries,
        successful_deliveries: successfulDeliveries,
        failed_deliveries: failedDeliveries,
        success_rate: successRate,
        average_response_time: 0, // Would need to track response times
        last_24h_deliveries: recentDeliveries?.length || 0,
        endpoints_count: endpointsCount,
        active_endpoints: activeEndpoints
      };
    } catch (error) {
      console.error('Error fetching webhook stats:', error);
      return {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        success_rate: 0,
        average_response_time: 0,
        last_24h_deliveries: 0,
        endpoints_count: 0,
        active_endpoints: 0
      };
    }
  }

  static async getWebhookDeliveries(profileId: string, endpointId?: string, limit = 50): Promise<WebhookDelivery[]> {
    try {
      let query = supabase
        .from('webhook_deliveries')
        .select('*, webhook_endpoints!inner(profile_id, name, url)')
        .eq('webhook_endpoints.profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (endpointId) {
        query = query.eq('endpoint_id', endpointId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching webhook deliveries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      return [];
    }
  }

  // Testing and Validation
  static async testWebhookEndpoint(endpointId: string): Promise<{
    success: boolean
    response_time: number
    status_code?: number
    error_message?: string
  }> {
    try {
      const { data: endpoint } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', endpointId)
        .single();

      if (!endpoint) {
        return {
          success: false,
          response_time: 0,
          error_message: 'Endpoint not found'
        };
      }

      const testPayload = {
        id: 'test_' + Date.now(),
        event_type: 'webhook.test',
        created_at: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          timestamp: new Date().toISOString()
        }
      };

      const startTime = Date.now();
      const signature = this.generateSignature(JSON.stringify(testPayload), endpoint.secret_key);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test',
          'X-Webhook-Delivery': testPayload.id,
          'User-Agent': 'AI-Calling-Webhook/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(endpoint.security_config.timeout_ms)
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        response_time: responseTime,
        status_code: response.status,
        error_message: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        response_time: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Bulk Operations
  static async retryFailedDeliveries(profileId: string, endpointId?: string): Promise<{
    retried_count: number
    errors: string[]
  }> {
    try {
      let query = supabase
        .from('webhook_deliveries')
        .select('*, webhook_endpoints!inner(profile_id)')
        .eq('webhook_endpoints.profile_id', profileId)
        .eq('status', 'failed');

      if (endpointId) {
        query = query.eq('endpoint_id', endpointId);
      }

      const { data: failedDeliveries } = await query;

      if (!failedDeliveries || failedDeliveries.length === 0) {
        return { retried_count: 0, errors: [] };
      }

      const errors: string[] = [];
      let retriedCount = 0;

      for (const delivery of failedDeliveries) {
        try {
          // Reset delivery for retry
          await this.updateDeliveryStatus(delivery.id, {
            status: 'pending',
            attempt_count: 0,
            error_message: undefined,
            next_retry_at: undefined
          });

          // Get endpoint and retry
          const { data: endpoint } = await supabase
            .from('webhook_endpoints')
            .select('*')
            .eq('id', delivery.endpoint_id)
            .single();

          if (endpoint) {
            await this.attemptDelivery(delivery, endpoint);
            retriedCount++;
          }
        } catch (error) {
          errors.push(`Failed to retry delivery ${delivery.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { retried_count: retriedCount, errors };
    } catch (error) {
      return {
        retried_count: 0,
        errors: [`Error retrying failed deliveries: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // Event Types Registry
  static getAvailableEventTypes(): Array<{ type: string; description: string; example_payload: any }> {
    return [
      {
        type: 'call.started',
        description: 'Triggered when a call is initiated',
        example_payload: {
          call_id: 'call_123',
          phone_number: '+1234567890',
          agent_id: 'agent_456',
          campaign_id: 'campaign_789'
        }
      },
      {
        type: 'call.completed',
        description: 'Triggered when a call is completed',
        example_payload: {
          call_id: 'call_123',
          duration_seconds: 180,
          outcome: 'completed',
          transcript: 'Call transcript...',
          customer_satisfaction: 4
        }
      },
      {
        type: 'appointment.scheduled',
        description: 'Triggered when an appointment is scheduled',
        example_payload: {
          appointment_id: 'apt_123',
          customer_name: 'John Doe',
          appointment_date: '2024-01-15',
          appointment_time: '14:00',
          service_type: 'consultation'
        }
      },
      {
        type: 'function.called',
        description: 'Triggered when an AI agent calls a function',
        example_payload: {
          call_id: 'call_123',
          function_name: 'schedule_appointment',
          parameters: { date: '2024-01-15', time: '14:00' },
          result: { success: true, appointment_id: 'apt_123' }
        }
      },
      {
        type: 'campaign.completed',
        description: 'Triggered when a campaign finishes',
        example_payload: {
          campaign_id: 'campaign_789',
          total_leads: 100,
          calls_made: 85,
          successful_contacts: 42,
          conversions: 12
        }
      },
      {
        type: 'compliance.violation',
        description: 'Triggered when a compliance violation is detected',
        example_payload: {
          violation_type: 'dnc_violation',
          phone_number: '+1234567890',
          call_id: 'call_123',
          severity: 'high',
          description: 'Call made to number on DNC list'
        }
      }
    ];
  }
}
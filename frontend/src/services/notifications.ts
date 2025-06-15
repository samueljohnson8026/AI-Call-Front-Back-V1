import { supabase } from '../lib/supabase';

export interface EmailNotification {
  to: string
  subject: string
  template: string
  data: Record<string, any>
}

export interface WebhookPayload {
  event: string
  data: Record<string, any>
  timestamp: string
  user_id: string
}

export class NotificationService {
  // Email notification templates
  private static emailTemplates = {
    campaign_completed: {
      subject: 'Campaign "{campaign_name}" has completed',
      template: `
        <h2>Campaign Completed</h2>
        <p>Your campaign <strong>{campaign_name}</strong> has finished running.</p>
        <h3>Results:</h3>
        <ul>
          <li>Total leads: {total_leads}</li>
          <li>Calls made: {calls_made}</li>
          <li>Successful contacts: {successful_contacts}</li>
          <li>Success rate: {success_rate}%</li>
        </ul>
        <p>View detailed results in your <a href="{dashboard_url}">dashboard</a>.</p>
      `
    },
    usage_limit_warning: {
      subject: 'Usage Limit Warning - {usage_percentage}% of monthly limit reached',
      template: `
        <h2>Usage Limit Warning</h2>
        <p>You have used <strong>{minutes_used}</strong> out of <strong>{monthly_limit}</strong> minutes this month ({usage_percentage}%).</p>
        <p>Consider upgrading your plan to avoid service interruption.</p>
        <p><a href="{billing_url}">Upgrade your plan</a></p>
      `
    },
    appointment_scheduled: {
      subject: 'New appointment scheduled with {customer_name}',
      template: `
        <h2>New Appointment Scheduled</h2>
        <p>A new appointment has been scheduled:</p>
        <ul>
          <li>Customer: {customer_name}</li>
          <li>Phone: {customer_phone}</li>
          <li>Date: {appointment_date}</li>
          <li>Type: {appointment_type}</li>
        </ul>
        <p>View in your <a href="{appointments_url}">appointments dashboard</a>.</p>
      `
    },
    system_alert: {
      subject: 'System Alert: {alert_type}',
      template: `
        <h2>System Alert</h2>
        <p><strong>Alert Type:</strong> {alert_type}</p>
        <p><strong>Message:</strong> {message}</p>
        <p><strong>Time:</strong> {timestamp}</p>
        <p>Check the <a href="{status_url}">status page</a> for more information.</p>
      `
    },
    dnc_violation: {
      subject: 'DNC Compliance Alert',
      template: `
        <h2>Do Not Call Violation Detected</h2>
        <p>A call was attempted to a number on your Do Not Call list:</p>
        <ul>
          <li>Phone Number: {phone_number}</li>
          <li>Call Time: {call_time}</li>
          <li>Campaign: {campaign_name}</li>
        </ul>
        <p>Please review your <a href="{dnc_url}">DNC list</a> and campaign settings.</p>
      `
    }
  };

  // Send email notification using SendGrid (or similar service)
  static async sendEmail(notification: EmailNotification): Promise<boolean> {
    try {
      // In a real implementation, this would use SendGrid API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          to: notification.to,
          subject: notification.subject,
          html: this.processTemplate(notification.template, notification.data)
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Send webhook notification
  static async sendWebhook(webhookUrl: string, payload: WebhookPayload, secretKey?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Call-Center-Webhook/1.0'
      };

      // Add signature for webhook verification
      if (secretKey) {
        const signature = await this.generateWebhookSignature(JSON.stringify(payload), secretKey);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      return false;
    }
  }

  // Process webhook events
  static async processWebhookEvent(event: string, data: any, userId: string) {
    try {
      // Get user's webhook endpoints for this event
      const { data: webhooks } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .contains('events', [event]);

      if (!webhooks || webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        user_id: userId
      };

      // Send to all matching webhooks
      const deliveryPromises = webhooks.map(async (webhook) => {
        const success = await this.sendWebhook(webhook.url, payload, webhook.secret_key);
        
        // Log delivery attempt
        await supabase.from('webhook_deliveries').insert({
          webhook_id: webhook.id,
          event_type: event,
          payload,
          success,
          response_status: success ? 200 : 500
        });

        // Update webhook stats
        if (success) {
          await supabase
            .from('webhook_endpoints')
            .update({ 
              success_count: webhook.success_count + 1,
              last_triggered_at: new Date().toISOString()
            })
            .eq('id', webhook.id);
        } else {
          await supabase
            .from('webhook_endpoints')
            .update({ failure_count: webhook.failure_count + 1 })
            .eq('id', webhook.id);
        }

        return success;
      });

      await Promise.all(deliveryPromises);
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  // Send campaign completion notification
  static async notifyCampaignCompleted(userId: string, campaignData: any) {
    const user = await this.getUserProfile(userId);
    if (!user?.email) return;

    const notification: EmailNotification = {
      to: user.email,
      subject: this.emailTemplates.campaign_completed.subject.replace('{campaign_name}', campaignData.name),
      template: this.emailTemplates.campaign_completed.template,
      data: {
        campaign_name: campaignData.name,
        total_leads: campaignData.total_leads,
        calls_made: campaignData.leads_called,
        successful_contacts: campaignData.leads_answered,
        success_rate: ((campaignData.leads_answered / campaignData.total_leads) * 100).toFixed(1),
        dashboard_url: `${process.env.VITE_APP_URL}/campaigns`
      }
    };

    await this.sendEmail(notification);
    await this.processWebhookEvent('campaign.completed', campaignData, userId);
  }

  // Send usage limit warning
  static async notifyUsageLimitWarning(userId: string, usageData: any) {
    const user = await this.getUserProfile(userId);
    if (!user?.email) return;

    const usagePercentage = ((usageData.minutes_used / usageData.monthly_limit) * 100).toFixed(1);

    const notification: EmailNotification = {
      to: user.email,
      subject: this.emailTemplates.usage_limit_warning.subject.replace('{usage_percentage}', usagePercentage),
      template: this.emailTemplates.usage_limit_warning.template,
      data: {
        minutes_used: usageData.minutes_used,
        monthly_limit: usageData.monthly_limit,
        usage_percentage: usagePercentage,
        billing_url: `${process.env.VITE_APP_URL}/billing`
      }
    };

    await this.sendEmail(notification);
  }

  // Send appointment notification
  static async notifyAppointmentScheduled(userId: string, appointmentData: any) {
    const user = await this.getUserProfile(userId);
    if (!user?.email) return;

    const notification: EmailNotification = {
      to: user.email,
      subject: this.emailTemplates.appointment_scheduled.subject.replace('{customer_name}', appointmentData.customer_name),
      template: this.emailTemplates.appointment_scheduled.template,
      data: {
        customer_name: appointmentData.customer_name,
        customer_phone: appointmentData.customer_phone,
        appointment_date: new Date(appointmentData.scheduled_date).toLocaleString(),
        appointment_type: appointmentData.appointment_type,
        appointments_url: `${process.env.VITE_APP_URL}/appointments`
      }
    };

    await this.sendEmail(notification);
    await this.processWebhookEvent('appointment.scheduled', appointmentData, userId);
  }

  // Send system alert
  static async notifySystemAlert(userId: string, alertData: any) {
    const user = await this.getUserProfile(userId);
    if (!user?.email) return;

    const notification: EmailNotification = {
      to: user.email,
      subject: this.emailTemplates.system_alert.subject.replace('{alert_type}', alertData.type),
      template: this.emailTemplates.system_alert.template,
      data: {
        alert_type: alertData.type,
        message: alertData.message,
        timestamp: new Date().toLocaleString(),
        status_url: `${process.env.VITE_APP_URL}/status`
      }
    };

    await this.sendEmail(notification);
  }

  // Send DNC violation alert
  static async notifyDNCViolation(userId: string, violationData: any) {
    const user = await this.getUserProfile(userId);
    if (!user?.email) return;

    const notification: EmailNotification = {
      to: user.email,
      subject: this.emailTemplates.dnc_violation.subject,
      template: this.emailTemplates.dnc_violation.template,
      data: {
        phone_number: violationData.phone_number,
        call_time: new Date(violationData.call_time).toLocaleString(),
        campaign_name: violationData.campaign_name,
        dnc_url: `${process.env.VITE_APP_URL}/dnc`
      }
    };

    await this.sendEmail(notification);
  }

  // Utility methods
  private static processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    });
    return processed;
  }

  private static async generateWebhookSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static async getUserProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('email, client_name')
      .eq('id', userId)
      .single();
    
    return data;
  }

  // Zapier integration helpers
  static generateZapierWebhookUrl(zapId: string): string {
    return `https://hooks.zapier.com/hooks/catch/${zapId}/`;
  }

  static getZapierTemplateConfig(templateName: string) {
    const templates = {
      'slack-notifications': {
        name: 'Slack Notifications',
        description: 'Send call and campaign updates to Slack',
        events: ['call.completed', 'campaign.completed'],
        zapierUrl: 'https://zapier.com/apps/slack/integrations',
        samplePayload: {
          event: 'call.completed',
          data: {
            call_id: 'call_123',
            customer_phone: '+1234567890',
            duration: 120,
            outcome: 'successful',
            agent_name: 'Customer Service Agent'
          }
        }
      },
      'google-calendar': {
        name: 'Google Calendar Integration',
        description: 'Add appointments to Google Calendar',
        events: ['appointment.scheduled'],
        zapierUrl: 'https://zapier.com/apps/google-calendar/integrations',
        samplePayload: {
          event: 'appointment.scheduled',
          data: {
            customer_name: 'John Doe',
            appointment_date: '2024-01-15T10:00:00Z',
            appointment_type: 'Consultation',
            duration_minutes: 30
          }
        }
      },
      'crm-updates': {
        name: 'CRM Updates',
        description: 'Update leads in your CRM system',
        events: ['call.completed', 'lead.updated'],
        zapierUrl: 'https://zapier.com/apps/salesforce/integrations',
        samplePayload: {
          event: 'lead.updated',
          data: {
            lead_id: 'lead_123',
            phone_number: '+1234567890',
            status: 'contacted',
            notes: 'Interested in product demo'
          }
        }
      }
    };

    return templates[templateName as keyof typeof templates];
  }
}
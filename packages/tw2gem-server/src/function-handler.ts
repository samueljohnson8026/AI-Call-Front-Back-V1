// import { DatabaseService } from '../../dashboard/src/services/database'
import { createClient } from '@supabase/supabase-js';

export interface FunctionCallRequest {
  name: string
  args: Record<string, any>
  callId: string
  userId?: string
  agentId?: string
}

export interface FunctionCallResponse {
  success: boolean
  result?: any
  error?: string
  executionTime?: number
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  handler: (args: Record<string, any>, context: FunctionContext) => Promise<any>
  requiresAuth?: boolean
  permissions?: string[]
}

export interface FunctionContext {
  callId: string
  userId?: string
  agentId?: string
  supabase?: any
}

export class FunctionCallHandler {
  private functions: Map<string, FunctionDefinition> = new Map();
  private supabase: any;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.registerCoreFunctions();
  }

  // Register a new function
  registerFunction(definition: FunctionDefinition) {
    this.functions.set(definition.name, definition);
    console.log(`Registered function: ${definition.name}`);
  }

  // Get all registered functions for Gemini setup
  getFunctionDefinitions(): object[] {
    return Array.from(this.functions.values()).map(func => ({
      function_declarations: [{
        name: func.name,
        description: func.description,
        parameters: func.parameters
      }]
    }));
  }

  // Execute a function call
  async executeFunction(request: FunctionCallRequest): Promise<FunctionCallResponse> {
    const startTime = Date.now();
    
    try {
      const functionDef = this.functions.get(request.name);
      if (!functionDef) {
        return {
          success: false,
          error: `Function '${request.name}' not found`,
          executionTime: Date.now() - startTime
        };
      }

      // Validate permissions if required
      if (functionDef.requiresAuth && !request.userId) {
        return {
          success: false,
          error: 'Authentication required for this function',
          executionTime: Date.now() - startTime
        };
      }

      // Create function context
      const context: FunctionContext = {
        callId: request.callId,
        userId: request.userId,
        agentId: request.agentId,
        supabase: this.supabase
      };

      // Execute the function
      const result = await functionDef.handler(request.args, context);

      const executionTime = Date.now() - startTime;

      // Log the function call
      if (this.supabase && request.userId) {
        await this.logFunctionCall({
          profile_id: request.userId,
          call_id: request.callId,
          function_name: request.name,
          parameters: request.args,
          result,
          execution_time_ms: executionTime,
          success: true
        });
      }

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed function call
      if (this.supabase && request.userId) {
        await this.logFunctionCall({
          profile_id: request.userId,
          call_id: request.callId,
          function_name: request.name,
          parameters: request.args,
          execution_time_ms: executionTime,
          success: false,
          error_message: errorMessage
        });
      }

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  // Register core business functions
  private registerCoreFunctions() {
    // Schedule appointment function
    this.registerFunction({
      name: 'schedule_appointment',
      description: 'Schedule an appointment for a customer',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: 'Customer full name' },
          customer_phone: { type: 'string', description: 'Customer phone number' },
          customer_email: { type: 'string', description: 'Customer email address' },
          appointment_date: { type: 'string', description: 'Appointment date in YYYY-MM-DD format' },
          appointment_time: { type: 'string', description: 'Appointment time in HH:MM format' },
          service_type: { type: 'string', description: 'Type of service requested' },
          notes: { type: 'string', description: 'Additional notes or requirements' }
        },
        required: ['customer_name', 'customer_phone', 'appointment_date', 'appointment_time']
      },
      handler: this.handleScheduleAppointment.bind(this),
      requiresAuth: true
    });

    // Update lead status function
    this.registerFunction({
      name: 'update_lead_status',
      description: 'Update the status of a lead in the CRM',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'Lead ID to update' },
          status: { 
            type: 'string', 
            enum: ['contacted', 'interested', 'not_interested', 'callback_requested', 'appointment_scheduled', 'converted'],
            description: 'New status for the lead' 
          },
          notes: { type: 'string', description: 'Notes about the interaction' },
          callback_date: { type: 'string', description: 'Callback date if status is callback_requested' },
          interest_level: { type: 'number', minimum: 1, maximum: 10, description: 'Interest level from 1-10' }
        },
        required: ['lead_id', 'status']
      },
      handler: this.handleUpdateLeadStatus.bind(this),
      requiresAuth: true
    });

    // Send follow-up email function
    this.registerFunction({
      name: 'send_followup_email',
      description: 'Send a follow-up email to a customer',
      parameters: {
        type: 'object',
        properties: {
          customer_email: { type: 'string', description: 'Customer email address' },
          template_type: { 
            type: 'string',
            enum: ['appointment_confirmation', 'follow_up', 'thank_you', 'information_request'],
            description: 'Type of email template to use'
          },
          custom_message: { type: 'string', description: 'Custom message to include' },
          appointment_details: { type: 'object', description: 'Appointment details if applicable' }
        },
        required: ['customer_email', 'template_type']
      },
      handler: this.handleSendFollowupEmail.bind(this),
      requiresAuth: true
    });

    // Add to DNC list function
    this.registerFunction({
      name: 'add_to_dnc',
      description: 'Add a phone number to the Do Not Call list',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string', description: 'Phone number to add to DNC list' },
          reason: { 
            type: 'string',
            enum: ['customer_request', 'compliance', 'invalid_number', 'other'],
            description: 'Reason for adding to DNC'
          },
          notes: { type: 'string', description: 'Additional notes' }
        },
        required: ['phone_number', 'reason']
      },
      handler: this.handleAddToDNC.bind(this),
      requiresAuth: true
    });

    // Get customer information function
    this.registerFunction({
      name: 'get_customer_info',
      description: 'Retrieve customer information from the database',
      parameters: {
        type: 'object',
        properties: {
          phone_number: { type: 'string', description: 'Customer phone number' },
          email: { type: 'string', description: 'Customer email address' },
          customer_id: { type: 'string', description: 'Customer ID' }
        }
      },
      handler: this.handleGetCustomerInfo.bind(this),
      requiresAuth: true
    });

    // Calculate pricing function
    this.registerFunction({
      name: 'calculate_pricing',
      description: 'Calculate pricing for services based on customer requirements',
      parameters: {
        type: 'object',
        properties: {
          service_type: { type: 'string', description: 'Type of service' },
          quantity: { type: 'number', description: 'Quantity or duration' },
          customer_tier: { 
            type: 'string',
            enum: ['basic', 'standard', 'premium'],
            description: 'Customer tier for pricing'
          },
          discount_code: { type: 'string', description: 'Discount code if applicable' }
        },
        required: ['service_type', 'quantity']
      },
      handler: this.handleCalculatePricing.bind(this),
      requiresAuth: false
    });

    // Check availability function
    this.registerFunction({
      name: 'check_availability',
      description: 'Check availability for appointments or services',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to check in YYYY-MM-DD format' },
          time_range: { type: 'string', description: 'Time range preference (morning, afternoon, evening)' },
          service_type: { type: 'string', description: 'Type of service' },
          duration: { type: 'number', description: 'Duration in minutes' }
        },
        required: ['date']
      },
      handler: this.handleCheckAvailability.bind(this),
      requiresAuth: true
    });
  }

  // Function handlers
  private async handleScheduleAppointment(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const appointmentData = {
      profile_id: context.userId,
      customer_name: args.customer_name,
      customer_phone: args.customer_phone,
      customer_email: args.customer_email,
      appointment_date: args.appointment_date,
      appointment_time: args.appointment_time,
      service_type: args.service_type,
      notes: args.notes || '',
      status: 'scheduled',
      call_id: context.callId
    };

    const { data, error } = await context.supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) throw new Error(`Failed to schedule appointment: ${error.message}`);

    return {
      appointment_id: data.id,
      confirmation_number: `APT-${data.id.slice(-8).toUpperCase()}`,
      message: `Appointment scheduled for ${args.customer_name} on ${args.appointment_date} at ${args.appointment_time}`
    };
  }

  private async handleUpdateLeadStatus(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const updateData: any = {
      status: args.status,
      notes: args.notes,
      last_contact_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (args.callback_date) {
      updateData.callback_date = args.callback_date;
    }

    if (args.interest_level) {
      updateData.interest_level = args.interest_level;
    }

    const { data, error } = await context.supabase
      .from('campaign_leads')
      .update(updateData)
      .eq('id', args.lead_id)
      .eq('profile_id', context.userId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update lead: ${error.message}`);

    return {
      lead_id: args.lead_id,
      new_status: args.status,
      message: `Lead status updated to ${args.status}`
    };
  }

  private async handleSendFollowupEmail(args: any, context: FunctionContext) {
    // This would integrate with an email service like SendGrid, Mailgun, etc.
    // For now, we'll log the email request
    
    const emailData = {
      profile_id: context.userId,
      call_id: context.callId,
      recipient_email: args.customer_email,
      template_type: args.template_type,
      custom_message: args.custom_message,
      appointment_details: args.appointment_details,
      sent_at: new Date().toISOString(),
      status: 'queued'
    };

    // Log the email request (you would implement actual email sending)
    console.log('Email queued:', emailData);

    return {
      email_id: `email_${Date.now()}`,
      status: 'queued',
      message: `Follow-up email queued for ${args.customer_email}`
    };
  }

  private async handleAddToDNC(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    const dncData = {
      profile_id: context.userId,
      phone_number: args.phone_number,
      reason: args.reason,
      notes: args.notes || '',
      added_by: 'ai_agent',
      call_id: context.callId
    };

    const { data, error } = await context.supabase
      .from('dnc_lists')
      .insert(dncData)
      .select()
      .single();

    if (error) throw new Error(`Failed to add to DNC: ${error.message}`);

    return {
      dnc_id: data.id,
      phone_number: args.phone_number,
      message: `Phone number ${args.phone_number} added to Do Not Call list`
    };
  }

  private async handleGetCustomerInfo(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    let query = context.supabase
      .from('campaign_leads')
      .select('*')
      .eq('profile_id', context.userId);

    if (args.phone_number) {
      query = query.eq('phone_number', args.phone_number);
    } else if (args.email) {
      query = query.eq('email', args.email);
    } else if (args.customer_id) {
      query = query.eq('id', args.customer_id);
    } else {
      throw new Error('Phone number, email, or customer ID required');
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { message: 'Customer not found' };
      }
      throw new Error(`Failed to get customer info: ${error.message}`);
    }

    return {
      customer_id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      phone: data.phone_number,
      email: data.email,
      company: data.company,
      status: data.status,
      last_contact: data.last_contact_date,
      notes: data.notes
    };
  }

  private async handleCalculatePricing(args: any, context: FunctionContext) {
    // This would integrate with your pricing engine
    // For now, we'll return sample pricing
    
    const basePrices: Record<string, number> = {
      'consultation': 100,
      'basic_service': 200,
      'premium_service': 500,
      'enterprise_service': 1000
    };

    const tierMultipliers: Record<string, number> = {
      'basic': 1.0,
      'standard': 0.9,
      'premium': 0.8
    };

    const basePrice = basePrices[args.service_type] || 100;
    const quantity = args.quantity || 1;
    const tierMultiplier = tierMultipliers[args.customer_tier] || 1.0;

    let totalPrice = basePrice * quantity * tierMultiplier;

    // Apply discount if provided
    if (args.discount_code) {
      // Simple discount logic - in reality, you'd check against a database
      const discountPercent = args.discount_code === 'SAVE10' ? 0.1 : 0;
      totalPrice = totalPrice * (1 - discountPercent);
    }

    return {
      service_type: args.service_type,
      quantity: args.quantity,
      base_price: basePrice,
      tier_discount: Math.round((1 - tierMultiplier) * 100),
      total_price: Math.round(totalPrice * 100) / 100,
      currency: 'USD'
    };
  }

  private async handleCheckAvailability(args: any, context: FunctionContext) {
    if (!context.userId) throw new Error('User ID required');

    // Check existing appointments for the date
    const { data: appointments, error } = await context.supabase
      .from('appointments')
      .select('appointment_time, duration')
      .eq('profile_id', context.userId)
      .eq('appointment_date', args.date)
      .eq('status', 'scheduled');

    if (error) throw new Error(`Failed to check availability: ${error.message}`);

    // Generate available time slots (simplified logic)
    const businessHours = {
      start: 9, // 9 AM
      end: 17   // 5 PM
    };

    const availableSlots: string[] = [];
    const bookedTimes = appointments?.map((apt: any) => apt.appointment_time) || [];

    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      if (!bookedTimes.includes(timeSlot)) {
        availableSlots.push(timeSlot);
      }
    }

    return {
      date: args.date,
      available_slots: availableSlots,
      total_available: availableSlots.length,
      message: availableSlots.length > 0 
        ? `${availableSlots.length} time slots available`
        : 'No availability for this date'
    };
  }

  private async logFunctionCall(logData: any) {
    try {
      await this.supabase
        .from('function_call_logs')
        .insert(logData);
    } catch (error) {
      console.error('Error logging function call:', error);
    }
  }
}
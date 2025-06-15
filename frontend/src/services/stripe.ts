import { loadStripe, type Stripe } from '@stripe/stripe-js';

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  limits: {
    calls_per_month: number
    agents: number
    campaigns: number
    storage_gb: number
  }
  stripe_price_id: string
  popular?: boolean
}

export interface PaymentMethod {
  id: string
  type: 'card'
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default: boolean
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  created: number
  invoice_pdf?: string
  description?: string
}

export interface UsageRecord {
  id: string
  quantity: number
  timestamp: number
  subscription_item: string
}

export class StripeService {
  private stripe: Stripe | null = null;
  private publishableKey: string;

  constructor(publishableKey: string) {
    this.publishableKey = publishableKey;
    this.initializeStripe();
  }

  private async initializeStripe() {
    try {
      this.stripe = await loadStripe(this.publishableKey);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }

  // Get available subscription plans
  static getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'basic',
        name: 'Basic',
        description: 'Perfect for small businesses getting started',
        price: 99,
        interval: 'month',
        features: [
          'Up to 500 calls per month',
          '2 AI agents',
          '5 active campaigns',
          'Basic analytics',
          'Email support',
          '10GB storage'
        ],
        limits: {
          calls_per_month: 500,
          agents: 2,
          campaigns: 5,
          storage_gb: 10
        },
        stripe_price_id: 'price_basic_monthly'
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Ideal for growing businesses',
        price: 299,
        interval: 'month',
        features: [
          'Up to 2,000 calls per month',
          '5 AI agents',
          '20 active campaigns',
          'Advanced analytics',
          'Priority support',
          '50GB storage',
          'Custom webhooks',
          'API access'
        ],
        limits: {
          calls_per_month: 2000,
          agents: 5,
          campaigns: 20,
          storage_gb: 50
        },
        stripe_price_id: 'price_standard_monthly',
        popular: true
      },
      {
        id: 'premium',
        name: 'Premium',
        description: 'For enterprises with high volume needs',
        price: 799,
        interval: 'month',
        features: [
          'Up to 10,000 calls per month',
          'Unlimited AI agents',
          'Unlimited campaigns',
          'Real-time analytics',
          'Dedicated support',
          '200GB storage',
          'Advanced webhooks',
          'Full API access',
          'Custom integrations',
          'White-label options'
        ],
        limits: {
          calls_per_month: 10000,
          agents: -1, // unlimited
          campaigns: -1, // unlimited
          storage_gb: 200
        },
        stripe_price_id: 'price_premium_monthly'
      }
    ];
  }

  // Create checkout session for subscription
  async createCheckoutSession(priceId: string, customerId?: string): Promise<{ sessionId: string } | null> {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      return null;
    }

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          customer_id: customerId,
          success_url: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/billing`
        })
      });

      const { sessionId } = await response.json();
      return { sessionId };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return null;
    }
  }

  // Redirect to Stripe Checkout
  async redirectToCheckout(sessionId: string): Promise<void> {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      return;
    }

    const { error } = await this.stripe.redirectToCheckout({ sessionId });
    
    if (error) {
      console.error('Error redirecting to checkout:', error);
    }
  }

  // Create setup intent for adding payment method
  async createSetupIntent(customerId: string): Promise<{ client_secret: string } | null> {
    try {
      const response = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customer_id: customerId })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating setup intent:', error);
      return null;
    }
  }

  // Get customer's payment methods
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const response = await fetch(`/api/stripe/payment-methods?customer_id=${customerId}`);
      const data = await response.json();
      return data.payment_methods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  // Get customer's invoices
  async getInvoices(customerId: string): Promise<Invoice[]> {
    try {
      const response = await fetch(`/api/stripe/invoices?customer_id=${customerId}`);
      const data = await response.json();
      return data.invoices || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  // Get current subscription
  async getCurrentSubscription(customerId: string): Promise<any> {
    try {
      const response = await fetch(`/api/stripe/subscription?customer_id=${customerId}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      });

      return response.ok;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          price_id: newPriceId
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return false;
    }
  }

  // Record usage for metered billing
  async recordUsage(subscriptionItemId: string, quantity: number): Promise<boolean> {
    try {
      const response = await fetch('/api/stripe/record-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_item_id: subscriptionItemId,
          quantity,
          timestamp: Math.floor(Date.now() / 1000)
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error recording usage:', error);
      return false;
    }
  }

  // Get usage records
  async getUsageRecords(subscriptionItemId: string): Promise<UsageRecord[]> {
    try {
      const response = await fetch(`/api/stripe/usage-records?subscription_item_id=${subscriptionItemId}`);
      const data = await response.json();
      return data.usage_records || [];
    } catch (error) {
      console.error('Error fetching usage records:', error);
      return [];
    }
  }

  // Create customer portal session
  async createPortalSession(customerId: string): Promise<{ url: string } | null> {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          return_url: `${window.location.origin}/billing`
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating portal session:', error);
      return null;
    }
  }

  // Calculate pricing based on usage
  static calculateUsagePricing(plan: SubscriptionPlan, usage: {
    calls: number
    storage_gb: number
    overage_calls?: number
  }): {
    base_price: number
    overage_charges: number
    total_price: number
    breakdown: Array<{ item: string; quantity: number; rate: number; amount: number }>
  } {
    const breakdown = [];
    let overage_charges = 0;

    // Base subscription price
    breakdown.push({
      item: `${plan.name} Plan`,
      quantity: 1,
      rate: plan.price,
      amount: plan.price
    });

    // Call overage charges
    if (usage.calls > plan.limits.calls_per_month) {
      const overage_calls = usage.calls - plan.limits.calls_per_month;
      const call_overage_rate = plan.id === 'basic' ? 0.25 : plan.id === 'standard' ? 0.20 : 0.15;
      const call_overage_amount = overage_calls * call_overage_rate;
      
      overage_charges += call_overage_amount;
      breakdown.push({
        item: 'Additional Calls',
        quantity: overage_calls,
        rate: call_overage_rate,
        amount: call_overage_amount
      });
    }

    // Storage overage charges
    if (usage.storage_gb > plan.limits.storage_gb) {
      const overage_storage = usage.storage_gb - plan.limits.storage_gb;
      const storage_overage_rate = 2.00; // $2 per GB
      const storage_overage_amount = overage_storage * storage_overage_rate;
      
      overage_charges += storage_overage_amount;
      breakdown.push({
        item: 'Additional Storage (GB)',
        quantity: overage_storage,
        rate: storage_overage_rate,
        amount: storage_overage_amount
      });
    }

    return {
      base_price: plan.price,
      overage_charges,
      total_price: plan.price + overage_charges,
      breakdown
    };
  }

  // Format currency
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Stripe amounts are in cents
  }

  // Get plan by ID
  static getPlanById(planId: string): SubscriptionPlan | null {
    return this.getSubscriptionPlans().find(plan => plan.id === planId) || null;
  }

  // Check if feature is available in plan
  static hasFeature(plan: SubscriptionPlan, feature: string): boolean {
    return plan.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  }

  // Check usage limits
  static checkUsageLimits(plan: SubscriptionPlan, usage: {
    calls: number
    agents: number
    campaigns: number
    storage_gb: number
  }): {
    calls: { used: number; limit: number; percentage: number; exceeded: boolean }
    agents: { used: number; limit: number; percentage: number; exceeded: boolean }
    campaigns: { used: number; limit: number; percentage: number; exceeded: boolean }
    storage: { used: number; limit: number; percentage: number; exceeded: boolean }
  } {
    const checkLimit = (used: number, limit: number) => ({
      used,
      limit,
      percentage: limit === -1 ? 0 : Math.min((used / limit) * 100, 100),
      exceeded: limit !== -1 && used > limit
    });

    return {
      calls: checkLimit(usage.calls, plan.limits.calls_per_month),
      agents: checkLimit(usage.agents, plan.limits.agents),
      campaigns: checkLimit(usage.campaigns, plan.limits.campaigns),
      storage: checkLimit(usage.storage_gb, plan.limits.storage_gb)
    };
  }
}
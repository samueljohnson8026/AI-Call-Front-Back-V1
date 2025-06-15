export interface FiverrPackage {
  id: string
  name: string
  title: string
  description: string
  price: number
  delivery_time: number // in days
  revisions: number
  features: string[]
  extras?: FiverrExtra[]
  requirements: string[]
  category: 'basic' | 'standard' | 'premium'
  popular?: boolean
}

export interface FiverrExtra {
  id: string
  title: string
  description: string
  price: number
  delivery_time_addition: number // additional days
}

export interface FiverrOrder {
  id: string
  package_id: string
  extras: string[]
  total_price: number
  delivery_date: string
  status: 'pending' | 'in_progress' | 'delivered' | 'completed' | 'cancelled'
  requirements_submitted: boolean
  client_info: {
    name: string
    email: string
    company?: string
    phone?: string
  }
  project_details: Record<string, any>
  created_at: string
  updated_at: string
}

export class FiverrPackageService {
  // Get all available packages
  static getPackages(): FiverrPackage[] {
    return [
      {
        id: 'basic-ai-agent',
        name: 'Basic AI Agent Setup',
        title: 'I will set up a basic AI calling agent for your business',
        description: 'Get started with AI calling automation. Perfect for small businesses looking to automate their customer outreach.',
        price: 150,
        delivery_time: 3,
        revisions: 2,
        category: 'basic',
        features: [
          '1 AI agent configuration',
          'Basic script setup',
          'Up to 100 contacts import',
          'Basic analytics dashboard',
          '3 days of support',
          'Training video included'
        ],
        requirements: [
          'Business description and goals',
          'Target audience information',
          'Preferred calling script or talking points',
          'Contact list (CSV format)',
          'Business hours and timezone'
        ],
        extras: [
          {
            id: 'extra-contacts',
            title: 'Additional 500 contacts import',
            description: 'Import up to 500 additional contacts to your campaign',
            price: 25,
            delivery_time_addition: 1
          },
          {
            id: 'extra-script',
            title: 'Custom script writing',
            description: 'Professional script writing tailored to your business',
            price: 50,
            delivery_time_addition: 1
          }
        ]
      },
      {
        id: 'standard-ai-system',
        name: 'Standard AI Call Center',
        title: 'I will build a complete AI call center system for your business',
        description: 'Full-featured AI calling system with multiple agents, advanced analytics, and comprehensive automation.',
        price: 450,
        delivery_time: 7,
        revisions: 3,
        category: 'standard',
        popular: true,
        features: [
          '3 AI agents with different personalities',
          'Advanced script customization',
          'Up to 1,000 contacts import',
          'Campaign management system',
          'Real-time analytics dashboard',
          'Webhook integrations',
          'DNC list management',
          '7 days of support',
          'Live training session'
        ],
        requirements: [
          'Detailed business requirements',
          'Target audience personas',
          'Multiple script variations',
          'Contact lists with segmentation',
          'Integration requirements',
          'Compliance requirements'
        ],
        extras: [
          {
            id: 'extra-agents',
            title: '2 additional AI agents',
            description: 'Add 2 more specialized AI agents to your system',
            price: 100,
            delivery_time_addition: 2
          },
          {
            id: 'extra-integration',
            title: 'CRM integration setup',
            description: 'Connect your existing CRM system',
            price: 150,
            delivery_time_addition: 3
          },
          {
            id: 'extra-training',
            title: 'Team training session',
            description: '2-hour live training for your team',
            price: 200,
            delivery_time_addition: 0
          }
        ]
      },
      {
        id: 'premium-enterprise',
        name: 'Premium Enterprise Solution',
        title: 'I will create a custom enterprise AI calling solution',
        description: 'Enterprise-grade AI calling system with unlimited agents, custom integrations, and white-label options.',
        price: 1200,
        delivery_time: 14,
        revisions: 5,
        category: 'premium',
        features: [
          'Unlimited AI agents',
          'Custom voice training',
          'Unlimited contacts',
          'Multi-campaign management',
          'Advanced analytics & reporting',
          'Custom integrations',
          'White-label solution',
          'Compliance management',
          'Priority support (30 days)',
          'Dedicated account manager',
          'Custom training program'
        ],
        requirements: [
          'Enterprise requirements document',
          'Technical specifications',
          'Integration architecture',
          'Compliance requirements',
          'Branding guidelines',
          'Team structure and roles',
          'Success metrics and KPIs'
        ],
        extras: [
          {
            id: 'extra-voice-training',
            title: 'Custom voice model training',
            description: 'Train AI with your specific voice and tone',
            price: 500,
            delivery_time_addition: 7
          },
          {
            id: 'extra-api-development',
            title: 'Custom API development',
            description: 'Build custom APIs for your specific needs',
            price: 800,
            delivery_time_addition: 10
          },
          {
            id: 'extra-maintenance',
            title: '6 months maintenance',
            description: 'Extended maintenance and support package',
            price: 600,
            delivery_time_addition: 0
          }
        ]
      }
    ];
  }

  // Get package by ID
  static getPackageById(packageId: string): FiverrPackage | null {
    return this.getPackages().find(pkg => pkg.id === packageId) || null;
  }

  // Calculate total price with extras
  static calculateTotalPrice(packageId: string, extraIds: string[] = []): {
    package_price: number
    extras_price: number
    total_price: number
    delivery_time: number
  } {
    const package_ = this.getPackageById(packageId);
    if (!package_) {
      return { package_price: 0, extras_price: 0, total_price: 0, delivery_time: 0 };
    }

    let extras_price = 0;
    let additional_delivery_time = 0;

    extraIds.forEach(extraId => {
      const extra = package_.extras?.find(e => e.id === extraId);
      if (extra) {
        extras_price += extra.price;
        additional_delivery_time = Math.max(additional_delivery_time, extra.delivery_time_addition);
      }
    });

    return {
      package_price: package_.price,
      extras_price,
      total_price: package_.price + extras_price,
      delivery_time: package_.delivery_time + additional_delivery_time
    };
  }

  // Create a new order
  static createOrder(orderData: {
    package_id: string
    extras: string[]
    client_info: FiverrOrder['client_info']
    project_details: Record<string, any>
  }): FiverrOrder {
    const pricing = this.calculateTotalPrice(orderData.package_id, orderData.extras);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + pricing.delivery_time);

    return {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      package_id: orderData.package_id,
      extras: orderData.extras,
      total_price: pricing.total_price,
      delivery_date: deliveryDate.toISOString(),
      status: 'pending',
      requirements_submitted: false,
      client_info: orderData.client_info,
      project_details: orderData.project_details,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Get order requirements checklist
  static getOrderRequirements(packageId: string): {
    requirement: string
    description: string
    type: 'text' | 'file' | 'select' | 'multiselect'
    options?: string[]
    required: boolean
  }[] {
    const package_ = this.getPackageById(packageId);
    if (!package_) return [];

    const baseRequirements = [
      {
        requirement: 'Business Description',
        description: 'Describe your business, industry, and main services',
        type: 'text' as const,
        required: true
      },
      {
        requirement: 'Target Audience',
        description: 'Who are your ideal customers? Include demographics and characteristics',
        type: 'text' as const,
        required: true
      },
      {
        requirement: 'Calling Goals',
        description: 'What do you want to achieve with AI calling?',
        type: 'multiselect' as const,
        options: [
          'Lead generation',
          'Appointment setting',
          'Customer follow-up',
          'Survey collection',
          'Event promotion',
          'Product sales',
          'Service reminders'
        ],
        required: true
      },
      {
        requirement: 'Contact List',
        description: 'Upload your contact list in CSV format',
        type: 'file' as const,
        required: true
      },
      {
        requirement: 'Business Hours',
        description: 'When should the AI make calls?',
        type: 'text' as const,
        required: true
      },
      {
        requirement: 'Timezone',
        description: 'Your business timezone',
        type: 'select' as const,
        options: [
          'EST - Eastern Time',
          'CST - Central Time',
          'MST - Mountain Time',
          'PST - Pacific Time',
          'UTC - Coordinated Universal Time'
        ],
        required: true
      }
    ];

    // Add package-specific requirements
    if (package_.category === 'standard' || package_.category === 'premium') {
      baseRequirements.push(
        {
          requirement: 'CRM Integration',
          description: 'Do you need CRM integration? If yes, which CRM?',
          type: 'text' as const,
          required: false
        },
        {
          requirement: 'Compliance Requirements',
          description: 'Any specific compliance requirements (TCPA, GDPR, etc.)?',
          type: 'text' as const,
          required: false
        }
      );
    }

    if (package_.category === 'premium') {
      baseRequirements.push(
        {
          requirement: 'Technical Specifications',
          description: 'Upload technical requirements document',
          type: 'file' as const,
          required: true
        },
        {
          requirement: 'Branding Guidelines',
          description: 'Upload your branding guidelines if white-label is needed',
          type: 'file' as const,
          required: false
        },
        {
          requirement: 'Integration Architecture',
          description: 'Describe your current tech stack and integration needs',
          type: 'text' as const,
          required: true
        }
      );
    }

    return baseRequirements;
  }

  // Get delivery milestones
  static getDeliveryMilestones(packageId: string): {
    milestone: string
    description: string
    day: number
    deliverables: string[]
  }[] {
    const package_ = this.getPackageById(packageId);
    if (!package_) return [];

    const baseMilestones = [
      {
        milestone: 'Project Kickoff',
        description: 'Requirements review and project planning',
        day: 1,
        deliverables: [
          'Project plan document',
          'Requirements confirmation',
          'Timeline overview'
        ]
      }
    ];

    if (package_.category === 'basic') {
      baseMilestones.push(
        {
          milestone: 'AI Agent Setup',
          description: 'Configure AI agent and basic script',
          day: 2,
          deliverables: [
            'AI agent configuration',
            'Basic script setup',
            'Test call recording'
          ]
        },
        {
          milestone: 'Final Delivery',
          description: 'Complete system delivery and training',
          day: 3,
          deliverables: [
            'Complete AI calling system',
            'Analytics dashboard access',
            'Training video',
            'Support documentation'
          ]
        }
      );
    } else if (package_.category === 'standard') {
      baseMilestones.push(
        {
          milestone: 'System Architecture',
          description: 'Design system architecture and agent personalities',
          day: 2,
          deliverables: [
            'System architecture document',
            'Agent personality profiles',
            'Script variations'
          ]
        },
        {
          milestone: 'Development Phase',
          description: 'Build and configure the complete system',
          day: 5,
          deliverables: [
            'Multiple AI agents',
            'Campaign management system',
            'Analytics dashboard',
            'Integration setup'
          ]
        },
        {
          milestone: 'Testing & Training',
          description: 'System testing and client training',
          day: 7,
          deliverables: [
            'Tested system',
            'Live training session',
            'Documentation package',
            'Support setup'
          ]
        }
      );
    } else if (package_.category === 'premium') {
      baseMilestones.push(
        {
          milestone: 'Discovery & Planning',
          description: 'Detailed discovery and solution design',
          day: 3,
          deliverables: [
            'Discovery document',
            'Solution architecture',
            'Technical specifications',
            'Project roadmap'
          ]
        },
        {
          milestone: 'Core Development',
          description: 'Build core system and integrations',
          day: 8,
          deliverables: [
            'Core AI system',
            'Custom integrations',
            'White-label setup',
            'Security implementation'
          ]
        },
        {
          milestone: 'Advanced Features',
          description: 'Implement advanced features and customizations',
          day: 11,
          deliverables: [
            'Advanced analytics',
            'Custom features',
            'Compliance tools',
            'Performance optimization'
          ]
        },
        {
          milestone: 'Final Delivery',
          description: 'Complete delivery with training and support',
          day: 14,
          deliverables: [
            'Complete enterprise solution',
            'Custom training program',
            'Documentation suite',
            'Dedicated support setup'
          ]
        }
      );
    }

    return baseMilestones;
  }

  // Get package comparison
  static getPackageComparison(): {
    feature: string
    basic: string | boolean
    standard: string | boolean
    premium: string | boolean
  }[] {
    return [
      {
        feature: 'AI Agents',
        basic: '1',
        standard: '3',
        premium: 'Unlimited'
      },
      {
        feature: 'Contact Import',
        basic: '100',
        standard: '1,000',
        premium: 'Unlimited'
      },
      {
        feature: 'Script Customization',
        basic: 'Basic',
        standard: 'Advanced',
        premium: 'Custom'
      },
      {
        feature: 'Analytics Dashboard',
        basic: true,
        standard: true,
        premium: true
      },
      {
        feature: 'Campaign Management',
        basic: false,
        standard: true,
        premium: true
      },
      {
        feature: 'Webhook Integrations',
        basic: false,
        standard: true,
        premium: true
      },
      {
        feature: 'CRM Integration',
        basic: false,
        standard: 'Available as extra',
        premium: true
      },
      {
        feature: 'White-label Option',
        basic: false,
        standard: false,
        premium: true
      },
      {
        feature: 'Custom Voice Training',
        basic: false,
        standard: false,
        premium: 'Available as extra'
      },
      {
        feature: 'Support Duration',
        basic: '3 days',
        standard: '7 days',
        premium: '30 days'
      },
      {
        feature: 'Training',
        basic: 'Video only',
        standard: 'Live session',
        premium: 'Custom program'
      },
      {
        feature: 'Delivery Time',
        basic: '3 days',
        standard: '7 days',
        premium: '14 days'
      }
    ];
  }

  // Validate order requirements
  static validateOrderRequirements(packageId: string, requirements: Record<string, any>): {
    valid: boolean
    errors: string[]
  } {
    const requiredFields = this.getOrderRequirements(packageId)
      .filter(req => req.required)
      .map(req => req.requirement);

    const errors: string[] = [];

    requiredFields.forEach(field => {
      if (!requirements[field] || requirements[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
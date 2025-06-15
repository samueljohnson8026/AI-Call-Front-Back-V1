import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import UsageTracker from '../components/UsageTracker';
import type { CallLog } from '../lib/supabase';
import toast from 'react-hot-toast';

interface BusinessMetrics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  calls: {
    total: number
    thisMonth: number
    answered: number
    answerRate: number
    avgDuration: number
  }
  appointments: {
    total: number
    thisMonth: number
    conversionRate: number
    showRate: number
  }
  campaigns: {
    active: number
    totalLeads: number
    contacted: number
    converted: number
    conversionRate: number
  }
  agents: {
    total: number
    active: number
    utilization: number
    avgSatisfaction: number
  }
  costs: {
    thisMonth: number
    lastMonth: number
    perCall: number
    perMinute: number
  }
}

interface RealtimeStats {
  activeCalls: number
  queuedCalls: number
  availableAgents: number
  systemHealth: 'healthy' | 'warning' | 'critical'
}

export default function EnhancedDashboardPage() {
  const { user } = useUser();
  // Removed unused variable
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats>({
    activeCalls: 0,
    queuedCalls: 0,
    availableAgents: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupRealtimeSubscriptions();
      
      // Refresh data every 30 seconds
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, timeRange]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load recent calls
      const calls = await DatabaseService.getCallLogs(user!.id, 10);
      setRecentCalls(calls);

      // Load business metrics
      const metrics = await loadBusinessMetrics();
      setBusinessMetrics(metrics);

      // Load realtime stats
      const stats = await loadRealtimeStats();
      setRealtimeStats(stats);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessMetrics = async (): Promise<BusinessMetrics> => {
    // Load real analytics data from database - NO MOCK DATA
    const analytics = await DatabaseService.getAnalytics(user!.id);
    
    // Calculate metrics from available data
    const totalCalls = analytics.totalCalls || 0;
    const successfulCalls = analytics.successfulCalls || 0;
    const answerRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    // Estimate revenue based on successful calls (placeholder calculation)
    const estimatedRevenuePerCall = 50; // $50 average value per successful call
    const estimatedRevenue = successfulCalls * estimatedRevenuePerCall;
    
    return {
      revenue: {
        total: estimatedRevenue,
        thisMonth: estimatedRevenue,
        lastMonth: 0, // No historical data available yet
        growth: 0
      },
      calls: {
        total: totalCalls,
        thisMonth: totalCalls,
        answered: successfulCalls,
        answerRate: answerRate,
        avgDuration: analytics.averageCallDuration || 0
      },
      appointments: {
        total: analytics.appointmentsScheduled || 0,
        thisMonth: analytics.appointmentsScheduled || 0,
        conversionRate: totalCalls > 0 ? ((analytics.appointmentsScheduled || 0) / totalCalls) * 100 : 0,
        showRate: 0 // Not available in current schema
      },
      campaigns: {
        active: 0, // Not available in current analytics
        totalLeads: 0,
        contacted: totalCalls,
        converted: analytics.salesCompleted || 0,
        conversionRate: totalCalls > 0 ? ((analytics.salesCompleted || 0) / totalCalls) * 100 : 0
      },
      agents: {
        total: 5, // Default from system
        active: 5,
        utilization: 0, // Calculate from active calls
        avgSatisfaction: analytics.customerSatisfactionAvg || 0
      },
      costs: {
        thisMonth: totalCalls * 0.85, // Estimated cost per call
        lastMonth: 0,
        perCall: 0.85,
        perMinute: 0.12
      }
    };
  };

  const loadRealtimeStats = async (): Promise<RealtimeStats> => {
    try {
      const activeCalls = await DatabaseService.getActiveCalls(user!.id);
      const agentStatuses = await DatabaseService.getAgentStatuses(user!.id);
      const callQueue = await DatabaseService.getCallQueue(user!.id);

      const availableAgents = agentStatuses.filter(agent => 
        agent.is_active && agent.status === 'available'
      ).length;

      const systemHealth = activeCalls.length > 10 ? 'warning' : 
                          activeCalls.length > 20 ? 'critical' : 'healthy';

      return {
        activeCalls: activeCalls.length,
        queuedCalls: callQueue.length,
        availableAgents,
        systemHealth
      };
    } catch (error) {
      console.error('Error loading realtime stats:', error);
      return {
        activeCalls: 0,
        queuedCalls: 0,
        availableAgents: 0,
        systemHealth: 'healthy'
      };
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to call updates for realtime stats
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user!.id,
      () => {
        // Refresh realtime stats when calls update
        loadRealtimeStats().then(setRealtimeStats);
      }
    );

    return () => {
      callSubscription?.unsubscribe();
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (growth < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600">Real-time insights and key performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={loadDashboardData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <SignalIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Live Status</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{realtimeStats.activeCalls} Active Calls</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>{realtimeStats.queuedCalls} Queued</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{realtimeStats.availableAgents} Available Agents</span>
              </span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            realtimeStats.systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
            realtimeStats.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            System {realtimeStats.systemHealth}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics ? formatCurrency(businessMetrics.revenue.thisMonth) : '$0'}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
          </div>
          {businessMetrics && (
            <div className="mt-4 flex items-center space-x-2">
              {getGrowthIcon(businessMetrics.revenue.growth)}
              <span className={`text-sm ${getGrowthColor(businessMetrics.revenue.growth)}`}>
                {formatPercentage(Math.abs(businessMetrics.revenue.growth))} vs last month
              </span>
            </div>
          )}
        </div>

        {/* Calls */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calls This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics?.calls.thisMonth || 0}
              </p>
            </div>
            <PhoneIcon className="h-8 w-8 text-blue-600" />
          </div>
          {businessMetrics && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                {formatPercentage(businessMetrics.calls.answerRate)} answer rate
              </span>
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Appointments</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics?.appointments.thisMonth || 0}
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-purple-600" />
          </div>
          {businessMetrics && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                {formatPercentage(businessMetrics.appointments.conversionRate)} conversion
              </span>
            </div>
          )}
        </div>

        {/* Agent Utilization */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agent Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {businessMetrics ? formatPercentage(businessMetrics.agents.utilization) : '0%'}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-indigo-600" />
          </div>
          {businessMetrics && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">
                {businessMetrics.agents.active}/{businessMetrics.agents.total} active
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
          </div>
          <div className="p-6">
            {businessMetrics && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Campaigns</span>
                  <span className="font-medium">{businessMetrics.campaigns.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Leads</span>
                  <span className="font-medium">{businessMetrics.campaigns.totalLeads.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Contacted</span>
                  <span className="font-medium">{businessMetrics.campaigns.contacted.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Converted</span>
                  <span className="font-medium">{businessMetrics.campaigns.converted.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                    <span className="font-bold text-green-600">
                      {formatPercentage(businessMetrics.campaigns.conversionRate)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Cost Analysis</h3>
          </div>
          <div className="p-6">
            {businessMetrics && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-medium">{formatCurrency(businessMetrics.costs.thisMonth)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Month</span>
                  <span className="font-medium">{formatCurrency(businessMetrics.costs.lastMonth)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cost per Call</span>
                  <span className="font-medium">{formatCurrency(businessMetrics.costs.perCall)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cost per Minute</span>
                  <span className="font-medium">{formatCurrency(businessMetrics.costs.perMinute)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">ROI</span>
                    <span className="font-bold text-green-600">
                      {formatPercentage(
                        ((businessMetrics.revenue.thisMonth - businessMetrics.costs.thisMonth) / 
                         businessMetrics.costs.thisMonth) * 100
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Call Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentCalls.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent calls
            </div>
          ) : (
            recentCalls.slice(0, 5).map((call) => (
              <div key={call.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      call.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {call.phone_number_to}
                      </p>
                      <p className="text-xs text-gray-500">
                        {call.direction === 'inbound' ? 'Inbound' : 'Outbound'} • 
                        {new Date(call.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs px-2 py-1 rounded-full ${
                      call.status === 'completed' ? 'text-green-600 bg-green-100' :
                      call.status === 'failed' ? 'text-red-600 bg-red-100' :
                      'text-yellow-600 bg-yellow-100'
                    }`}>
                      {call.status}
                    </p>
                    {call.duration_seconds && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDuration(call.duration_seconds)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Usage Tracker */}
      <UsageTracker />
    </div>
  );
}
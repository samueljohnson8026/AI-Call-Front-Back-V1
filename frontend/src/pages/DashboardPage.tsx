import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import UsageTracker from '../components/UsageTracker';
import type { CallLog, AnalyticsData } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useUser();
  const { canUseInbound } = usePermissions();
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'running' | 'stopped'>('stopped');

  useEffect(() => {
    if (user) {
      loadDashboardData();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load recent calls
      const calls = await DatabaseService.getCallLogs(user.id, 10);
      setRecentCalls(calls);

      // Load active calls
      const active = await DatabaseService.getActiveCallLogs(user.id);
      setActiveCalls(active);

      // Load analytics
      const analyticsData = await DatabaseService.getAnalytics(user.id);
      setAnalytics(analyticsData);

      // Simulate server status based on active calls
      setServerStatus(active.length > 0 ? 'running' : 'stopped');

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to call updates
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user.id,
      (updatedCall) => {
        // Update recent calls
        setRecentCalls(prev => 
          prev.map(call => call.id === updatedCall.id ? updatedCall : call)
        );
        
        // Update active calls
        if (updatedCall.status === 'in_progress') {
          setActiveCalls(prev => {
            const exists = prev.find(call => call.id === updatedCall.id);
            if (exists) {
              return prev.map(call => call.id === updatedCall.id ? updatedCall : call);
            } else {
              return [...prev, updatedCall];
            }
          });
        } else {
          setActiveCalls(prev => prev.filter(call => call.id !== updatedCall.id));
        }
      },
      (newCall) => {
        // Add new call to recent calls
        setRecentCalls(prev => [newCall, ...prev.slice(0, 9)]);
        
        // Add to active calls if in progress
        if (newCall.status === 'in_progress') {
          setActiveCalls(prev => [newCall, ...prev]);
        }
      },
      (callId) => {
        // Remove deleted call
        setRecentCalls(prev => prev.filter(call => call.id !== callId));
        setActiveCalls(prev => prev.filter(call => call.id !== callId));
      }
    );

    // Cleanup on unmount
    return () => {
      callSubscription.unsubscribe();
    };
  };

  const toggleServer = () => {
    // This would typically make an API call to start/stop the server
    const newStatus = serverStatus === 'running' ? 'stopped' : 'running';
    setServerStatus(newStatus);
    
    if (newStatus === 'running') {
      toast.success('AI server started successfully');
    } else {
      toast.success('AI server stopped');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'abandoned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-3 w-3 mr-1" />;
      case 'in_progress':
        return <PlayIcon className="h-3 w-3 mr-1" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = [
    { 
      name: 'Active Calls', 
      value: activeCalls.length.toString(), 
      icon: PhoneIcon, 
      color: 'text-green-500' 
    },
    { 
      name: 'Total Calls Today', 
      value: analytics?.totalCalls.toString() || '0', 
      icon: UserGroupIcon, 
      color: 'text-blue-500' 
    },
    { 
      name: 'Success Rate', 
      value: analytics ? `${Math.round((analytics.successfulCalls / Math.max(analytics.totalCalls, 1)) * 100)}%` : '0%', 
      icon: CheckCircleIcon, 
      color: 'text-emerald-500' 
    },
    { 
      name: 'Avg Duration', 
      value: analytics ? formatDuration(Math.round(analytics.averageCallDuration)) : '0m 0s', 
      icon: ClockIcon, 
      color: 'text-purple-500' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Server Control */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">AI Server Control</h3>
            <p className="text-slate-600">Manage your AI calling server</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${serverStatus === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">
                {serverStatus === 'running' ? 'Running' : 'Stopped'}
              </span>
            </div>
            <button
              onClick={toggleServer}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                serverStatus === 'running'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {serverStatus === 'running' ? (
                <>
                  <StopIcon className="h-5 w-5" />
                  <span>Stop Server</span>
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  <span>Start Server</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Tracker */}
      <UsageTracker />

      {/* Active Calls */}
      {canUseInbound && activeCalls.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Calls</h3>
          <div className="space-y-4">
            {activeCalls.map((call) => (
              <div key={call.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{call.phone_number_from}</p>
                    <p className="text-sm text-slate-500">
                      Duration: {formatDuration(call.duration_seconds)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {call.call_summary || 'Call in progress...'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <PlayIcon className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Calls</h3>
          <ChartBarIcon className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-hidden">
          {recentCalls.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {call.direction === 'inbound' ? call.phone_number_from : call.phone_number_to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                      {call.direction}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                        {getStatusIcon(call.status)}
                        {call.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {call.call_summary || call.outcome || 'No summary available'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatTimeAgo(call.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <PhoneIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No calls yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Start your AI server to begin receiving calls.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
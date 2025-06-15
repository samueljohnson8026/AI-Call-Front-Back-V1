import { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  SignalIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import type { AIAgent, CallLog, ActiveCall } from '../lib/supabase';
import toast from 'react-hot-toast';

// ActiveCall interface imported from supabase types

interface AgentStatus extends AIAgent {
  current_calls: number
  status: 'available' | 'busy' | 'offline'
  last_call_at?: string
}

// CallQueueItem interface removed - using CallLog directly

interface SystemMetrics {
  total_active_calls: number
  total_queued_calls: number
  average_wait_time: number
  system_health: 'healthy' | 'warning' | 'critical'
  uptime_percentage: number
}

export default function LiveCallsPage() {
  const { user } = useUser();
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [callQueue, setCallQueue] = useState<CallLog[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    total_active_calls: 0,
    total_queued_calls: 0,
    average_wait_time: 0,
    system_health: 'healthy',
    uptime_percentage: 99.9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLiveData();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadLiveData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load active calls
      const calls = await DatabaseService.getActiveCalls(user!.id);
      setActiveCalls(calls.map(call => ({
        ...call,
        agent_id: call.agent_id || 'unknown'
      })));
      
      // Load agent statuses
      const agents = await DatabaseService.getAgentStatuses(user!.id);
      setAgentStatuses(agents.map(agent => ({
        ...agent,
        current_calls: 0, // Default value since AIAgent doesn't have this
        status: 'available' as const
      })));
      
      // Load call queue
      const queue = await DatabaseService.getCallQueue(user!.id);
      setCallQueue(queue);
      
      // Calculate system metrics
      const metrics: SystemMetrics = {
        total_active_calls: calls.length,
        total_queued_calls: queue.length,
        average_wait_time: queue.length > 0 ? 120 : 0, // Default wait time for demo
        system_health: (calls.length > 10 ? 'warning' : 'healthy') as 'healthy' | 'warning' | 'critical',
        uptime_percentage: 99.9
      };
      setSystemMetrics(metrics);
      
    } catch (error) {
      console.error('Error loading live data:', error);
      toast.error('Failed to load live call data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to call updates
    const callSubscription = RealtimeService.subscribeToCallUpdates(
      user!.id,
      (updatedCall) => {
        setActiveCalls(prev => {
          const existing = prev.find(call => call.id === updatedCall.id);
          if (existing) {
            // Convert RealtimeCallUpdate to ActiveCall
            const activeCall: ActiveCall = {
              ...existing,
              status: updatedCall.status,
              duration_seconds: updatedCall.duration_seconds,
              ...(updatedCall.transcript && { transcript: updatedCall.transcript }),
              ...(updatedCall.call_summary && { call_summary: updatedCall.call_summary }),
              ...(updatedCall.sentiment_score && { sentiment_score: updatedCall.sentiment_score }),
              ...(updatedCall.outcome && { outcome: updatedCall.outcome })
            };
            return prev.map(call => call.id === updatedCall.id ? activeCall : call);
          }
          return prev;
        });
      }
    );

    // Subscribe to agent status updates
    const agentSubscription = RealtimeService.subscribeToAgentUpdates(
      user!.id,
      (updatedAgent) => {
        setAgentStatuses(prev => 
          prev.map(agent => 
            agent.id === updatedAgent.id ? { ...agent, ...updatedAgent } : agent
          )
        );
      },
      (newAgent) => {
        setAgentStatuses(prev => [...prev, newAgent as AgentStatus]);
      },
      (agentId) => {
        setAgentStatuses(prev => prev.filter(agent => agent.id !== agentId));
      }
    );

    return () => {
      if (typeof callSubscription === 'object' && callSubscription?.unsubscribe) {
        callSubscription.unsubscribe();
      }
      if (typeof agentSubscription === 'string') {
        RealtimeService.unsubscribe(agentSubscription);
      }
    };
  };

  const handleEmergencyStop = async () => {
    if (!confirm('Are you sure you want to stop ALL active calls? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.emergencyStopAllCalls(user!.id);
      toast.success('All calls stopped successfully');
      loadLiveData();
    } catch (error) {
      console.error('Error stopping calls:', error);
      toast.error('Failed to stop calls');
    }
  };

  const handleToggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await DatabaseService.toggleAgent(agentId, !isActive);
      toast.success(`Agent ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to toggle agent');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Live Call Monitoring</h1>
          <p className="text-gray-600">Real-time view of active calls and system status</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadLiveData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleEmergencyStop}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <StopIcon className="h-5 w-5 inline mr-2" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <PhoneIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Calls</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.total_active_calls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Queued Calls</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.total_queued_calls}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SignalIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatWaitTime(Math.round(systemMetrics.average_wait_time))}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              systemMetrics.system_health === 'healthy' ? 'bg-green-100' :
              systemMetrics.system_health === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {systemMetrics.system_health === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className={`text-lg font-bold capitalize ${getHealthColor(systemMetrics.system_health)}`}>
                {systemMetrics.system_health}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Calls ({activeCalls.length})</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {activeCalls.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No active calls
              </div>
            ) : (
              activeCalls.map((call) => (
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
                          {call.direction === 'inbound' ? 'Inbound' : 'Outbound'} • {call.agent_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDuration(call.duration_seconds)}
                      </p>
                      <p className={`text-xs px-2 py-1 rounded-full ${
                        call.call_quality === 'excellent' ? 'text-green-600 bg-green-100' :
                        call.call_quality === 'good' ? 'text-blue-600 bg-blue-100' :
                        call.call_quality === 'fair' ? 'text-yellow-600 bg-yellow-100' :
                        'text-red-600 bg-red-100'
                      }`}>
                        {call.call_quality}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Agent Status</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {agentStatuses.map((agent) => (
              <div key={agent.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">
                        {agent.agent_type} • {agent.voice_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className={`text-xs px-2 py-1 rounded-full ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {agent.current_calls}/{agent.max_concurrent_calls} calls
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        agent.is_active 
                          ? 'text-red-600 hover:bg-red-100' 
                          : 'text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {agent.is_active ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Queue */}
      {callQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Call Queue ({callQueue.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {callQueue.map((queueItem) => (
              <div key={queueItem.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {queueItem.phone_number_to}
                      </p>
                      <p className="text-xs text-gray-500">
                        {queueItem.agent_id || 'Any agent'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor('normal')}`}>
                      normal
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatWaitTime(120)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
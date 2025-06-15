import { useState, useEffect } from 'react';
import { usePermissions, useUser } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import type { Campaign } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  PhoneIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';

export default function OutboundCampaigns() {
  const { canUseOutboundDialer, maxAgentConfigurations, hasReachedAgentLimit } = usePermissions();
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && canUseOutboundDialer) {
      loadCampaigns();
    }
  }, [user, canUseOutboundDialer]);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const campaignsData = await DatabaseService.getCampaigns(user.id);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  // Mock current agent configurations count
  const currentAgentConfigs = campaigns.length;

  const calculateStats = () => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalLeads = campaigns.reduce((sum, c) => sum + c.total_leads, 0);
    const totalCalled = campaigns.reduce((sum, c) => sum + c.leads_called, 0);
    const totalCompleted = campaigns.reduce((sum, c) => sum + c.leads_completed, 0);
    const successRate = totalCalled > 0 ? ((totalCompleted / totalCalled) * 100).toFixed(1) : '0.0';

    return {
      activeCampaigns,
      totalLeads: totalLeads.toLocaleString(),
      totalCalled: totalCalled.toLocaleString(),
      successRate: `${successRate}%`
    };
  };

  const stats = calculateStats();

  const formatLastActivity = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!canUseOutboundDialer) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <PhoneIcon className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Outbound Dialer Not Available</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Your current plan doesn't include access to the outbound dialer feature. 
          Upgrade your plan to start creating and managing outbound campaigns.
        </p>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Upgrade Plan
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon className="h-4 w-4" />;
      case 'paused': return <PauseIcon className="h-4 w-4" />;
      case 'completed': return <StopIcon className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Campaign Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Outbound Campaigns</h2>
          <p className="text-slate-600">Manage your automated calling campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasReachedAgentLimit(currentAgentConfigs) && (
            <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Agent limit reached ({currentAgentConfigs}/{maxAgentConfigurations})
              </span>
            </div>
          )}
          <button
            disabled={hasReachedAgentLimit(currentAgentConfigs)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              hasReachedAgentLimit(currentAgentConfigs)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { name: 'Active Campaigns', value: stats.activeCampaigns.toString(), icon: PlayIcon, color: 'text-green-500' },
          { name: 'Total Leads', value: stats.totalLeads, icon: UserGroupIcon, color: 'text-blue-500' },
          { name: 'Calls Made', value: stats.totalCalled, icon: PhoneIcon, color: 'text-purple-500' },
          { name: 'Success Rate', value: stats.successRate, icon: ChartBarIcon, color: 'text-emerald-500' },
        ].map((stat) => (
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

      {/* Campaigns List */}
      {campaigns.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Your Campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{campaign.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)}
                        <span className="capitalize">{campaign.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {campaign.leads_called} / {campaign.total_leads} leads
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${campaign.total_leads > 0 ? (campaign.leads_called / campaign.total_leads) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{campaign.leads_answered} answered</div>
                      <div className="text-sm text-slate-500">
                        {campaign.leads_called > 0 ? ((campaign.leads_completed / campaign.leads_called) * 100).toFixed(1) : '0.0'}% success
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatLastActivity(campaign.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {campaign.status === 'active' && (
                          <button className="text-yellow-600 hover:text-yellow-900">
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <button className="text-green-600 hover:text-green-900">
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Get started by creating your first AI calling campaign to reach out to your leads automatically.
          </p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <PlusIcon className="h-4 w-4 inline mr-2" />
            Create Campaign
          </button>
        </div>
      )}

      {/* Agent Configuration Limit Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Agent Configuration Usage</h4>
            <p className="text-sm text-blue-700 mt-1">
              You're using {currentAgentConfigs} of {maxAgentConfigurations} available agent configurations. 
              {hasReachedAgentLimit(currentAgentConfigs) 
                ? ' Upgrade your plan to create more campaigns.'
                : ` You can create ${maxAgentConfigurations - currentAgentConfigs} more campaign${maxAgentConfigurations - currentAgentConfigs === 1 ? '' : 's'}.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
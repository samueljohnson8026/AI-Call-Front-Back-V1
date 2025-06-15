import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  EyeIcon,
  MegaphoneIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import type { Campaign, CampaignLead } from '../lib/supabase';
import toast from 'react-hot-toast';

// Removed unused interface

interface DialerStatus {
  isRunning: boolean
  activeCalls: number
  queuedLeads: number
  callsPerHour: number
  estimatedCompletion: string
}

export default function EnhancedCampaignsPage() {
  const { user } = useUser();
  const { canUseOutboundDialer } = usePermissions();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed unused state variables
  const [dialerStatuses, setDialerStatuses] = useState<Map<string, DialerStatus>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'performance'>('created');

  useEffect(() => {
    if (user && canUseOutboundDialer) {
      loadCampaigns();
      setupRealtimeSubscriptions();
      
      // Refresh dialer statuses every 10 seconds
      const interval = setInterval(updateDialerStatuses, 10000);
      return () => clearInterval(interval);
    }
  }, [user, canUseOutboundDialer]);

  useEffect(() => {
    filterAndSortCampaigns();
  }, [campaigns, searchTerm, statusFilter, sortBy]);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const campaignsData = await DatabaseService.getCampaigns(user.id);
      setCampaigns(campaignsData);
      await updateDialerStatuses();
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCampaigns = () => {
    let filtered = campaigns;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'performance':
          const aRate = (a.leads_answered || 0) / (a.leads_called || 1);
          const bRate = (b.leads_answered || 0) / (b.leads_called || 1);
          return bRate - aRate;
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  };

  const updateDialerStatuses = async () => {
    const statuses = new Map<string, DialerStatus>();
    
    for (const campaign of campaigns) {
      if (campaign.status === 'active') {
        // In a real implementation, this would query the actual dialer engine
        statuses.set(campaign.id, {
          isRunning: true,
          activeCalls: Math.floor(Math.random() * 5),
          queuedLeads: Math.floor(Math.random() * 100),
          callsPerHour: 45,
          estimatedCompletion: '2 hours'
        });
      }
    }
    
    setDialerStatuses(statuses);
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToCampaignUpdates(
      user.id,
      (updatedCampaign) => {
        setCampaigns(prev => 
          prev.map(campaign => 
            campaign.id === updatedCampaign.id ? updatedCampaign : campaign
          )
        );
      },
      (newCampaign) => {
        setCampaigns(prev => [...prev, newCampaign]);
      },
      (deletedCampaignId) => {
        setCampaigns(prev => prev.filter(campaign => campaign.id !== deletedCampaignId));
      }
    );

    return () => {
      if (subscription) {
        RealtimeService.unsubscribe(subscription);
      }
    };
  };

  const handleStartCampaign = async (campaign: Campaign) => {
    try {
      await DatabaseService.updateCampaign(campaign.id, { status: 'active' });
      toast.success(`Campaign "${campaign.name}" started`);
      loadCampaigns();
    } catch (error) {
      console.error('Error starting campaign:', error);
      toast.error('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      await DatabaseService.updateCampaign(campaign.id, { status: 'paused' });
      toast.success(`Campaign "${campaign.name}" paused`);
      loadCampaigns();
    } catch (error) {
      console.error('Error pausing campaign:', error);
      toast.error('Failed to pause campaign');
    }
  };

  const handleStopCampaign = async (campaign: Campaign) => {
    if (!confirm(`Are you sure you want to stop "${campaign.name}"? This will end all active calls.`)) {
      return;
    }

    try {
      await DatabaseService.updateCampaign(campaign.id, { status: 'completed' });
      toast.success(`Campaign "${campaign.name}" stopped`);
      loadCampaigns();
    } catch (error) {
      console.error('Error stopping campaign:', error);
      toast.error('Failed to stop campaign');
    }
  };

  // Removed unused function

  // Removed unused function

  // Removed unused function

  // Removed unused function

  const exportCampaignData = async (campaign: Campaign) => {
    try {
      const leads = await DatabaseService.getCampaignLeads(campaign.id);
      const csvContent = generateCSV(leads);
      downloadCSV(csvContent, `${campaign.name}_leads.csv`);
      toast.success('Campaign data exported successfully');
    } catch (error) {
      console.error('Error exporting campaign data:', error);
      toast.error('Failed to export campaign data');
    }
  };

  const generateCSV = (leads: CampaignLead[]): string => {
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Status', 'Outcome', 'Call Attempts', 'Last Called'];
    const rows = leads.map(lead => [
      `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      lead.phone_number,
      lead.email || '',
      lead.company || '',
      lead.status,
      lead.outcome || '',
      lead.call_attempts.toString(),
      lead.last_call_at || ''
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  // Removed unused function

  if (!canUseOutboundDialer) {
    return (
      <div className="text-center py-12">
        <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Outbound Dialer Not Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your current plan doesn't include outbound campaign features.
        </p>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600">Manage and monitor your outbound calling campaigns</p>
        </div>
        <button
          onClick={() => {/* TODO: Implement create modal */}}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="created">Sort by Created</option>
              <option value="name">Sort by Name</option>
              <option value="performance">Sort by Performance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => {
          const dialerStatus = dialerStatuses.get(campaign.id);
          const contactRate = ((campaign.leads_called || 0) / (campaign.total_leads || 1)) * 100;
          const answerRate = ((campaign.leads_answered || 0) / (campaign.leads_called || 1)) * 100;

          return (
            <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Campaign Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {campaign.description}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Leads</p>
                    <p className="text-lg font-semibold">{campaign.total_leads || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Called</p>
                    <p className="text-lg font-semibold">{campaign.leads_called || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact Rate</p>
                    <p className="text-sm font-medium text-blue-600">{formatPercentage(contactRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Answer Rate</p>
                    <p className="text-sm font-medium text-green-600">{formatPercentage(answerRate)}</p>
                  </div>
                </div>

                {/* Dialer Status */}
                {dialerStatus && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Auto-Dialer Status</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600">Running</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Active: </span>
                        <span className="font-medium">{dialerStatus.activeCalls}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Queued: </span>
                        <span className="font-medium">{dialerStatus.queuedLeads}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{formatPercentage(contactRate)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(contactRate, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleStartCampaign(campaign)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Start</span>
                    </button>
                  )}
                  
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handlePauseCampaign(campaign)}
                      className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                    >
                      <PauseIcon className="h-4 w-4" />
                      <span>Pause</span>
                    </button>
                  )}
                  
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleStartCampaign(campaign)}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                    >
                      <PlayIcon className="h-4 w-4" />
                      <span>Resume</span>
                    </button>
                  )}
                  
                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <button
                      onClick={() => handleStopCampaign(campaign)}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
                      <StopIcon className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => {/* TODO: Implement view leads */}}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span>Leads</span>
                  </button>
                  
                  <button
                    onClick={() => {/* TODO: Implement view stats */}}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Stats</span>
                  </button>
                  
                  <button
                    onClick={() => exportCampaignData(campaign)}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first campaign.'
            }
          </p>
        </div>
      )}

      {/* Modals would go here - CreateCampaignModal, LeadsModal, StatsModal */}
    </div>
  );
}
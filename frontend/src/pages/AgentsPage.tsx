import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  TrashIcon,
  PencilIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useUser, usePermissions } from '../contexts/UserContext';
import { DatabaseService } from '../services/database';
import { RealtimeService } from '../services/realtime';
import type { AIAgent } from '../lib/supabase';
import toast from 'react-hot-toast';

const VOICE_OPTIONS = [
  { value: 'Puck', label: 'Puck (Default)', description: 'Friendly and professional' },
  { value: 'Charon', label: 'Charon', description: 'Deep and authoritative' },
  { value: 'Kore', label: 'Kore', description: 'Warm and empathetic' },
  { value: 'Fenrir', label: 'Fenrir', description: 'Strong and confident' },
  { value: 'Aoede', label: 'Aoede', description: 'Melodic and soothing' },
  { value: 'Leda', label: 'Leda', description: 'Clear and articulate' },
  { value: 'Orus', label: 'Orus', description: 'Calm and reassuring' },
  { value: 'Zephyr', label: 'Zephyr', description: 'Light and energetic' }
];

const AGENT_TYPES = [
  { value: 'customer_service', label: 'Customer Service', description: 'General customer support and inquiries' },
  { value: 'sales', label: 'Sales', description: 'Lead qualification and sales conversion' },
  { value: 'support', label: 'Technical Support', description: 'Technical troubleshooting and assistance' },
  { value: 'appointment_booking', label: 'Appointment Booking', description: 'Schedule and manage appointments' },
  { value: 'survey', label: 'Survey', description: 'Conduct customer surveys and feedback collection' },
  { value: 'after_hours', label: 'After Hours', description: '24/7 support for urgent issues' },
  { value: 'general', label: 'General Assistant', description: 'Multi-purpose AI assistant' }
];

const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' }
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'America/Toronto', 'America/Mexico_City'
];

export default function AgentsPage() {
  const { user } = useUser();
  const { } = usePermissions();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);

  useEffect(() => {
    if (user) {
      loadAgents();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const loadAgents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const agentsData = await DatabaseService.getAIAgents(user.id);
      setAgents(agentsData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load AI agents');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    const subscription = RealtimeService.subscribeToAgentUpdates(
      user.id,
      (updatedAgent) => {
        setAgents(prev => 
          prev.map(agent => 
            agent.id === updatedAgent.id ? updatedAgent : agent
          )
        );
      },
      (newAgent) => {
        setAgents(prev => [newAgent, ...prev]);
      },
      (agentId) => {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
      }
    );

    return () => {
      RealtimeService.unsubscribe(subscription);
    };
  };

  const handleToggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await DatabaseService.updateAIAgent(agentId, { is_active: !isActive });
      toast.success(`Agent ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to update agent status');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      await DatabaseService.deleteAIAgent(agentId);
      toast.success('Agent deleted successfully');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleEditAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setShowEditModal(true);
  };

  const getAgentTypeInfo = (type: string) => {
    return AGENT_TYPES.find(t => t.value === type) || AGENT_TYPES[0];
  };

  const getVoiceInfo = (voice: string) => {
    return VOICE_OPTIONS.find(v => v.value === voice) || VOICE_OPTIONS[0];
  };

  const formatBusinessHours = (start?: string, end?: string) => {
    if (!start || !end) return '24/7';
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your AI agents for different phone numbers and use cases.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Create Agent
          </button>
        </div>
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-3 ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {agent.name}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                      className={`p-2 rounded-md ${
                        agent.is_active 
                          ? 'text-yellow-600 hover:bg-yellow-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {agent.is_active ? (
                        <PauseIcon className="h-4 w-4" />
                      ) : (
                        <PlayIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditAgent(agent)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {getAgentTypeInfo(agent.agent_type).label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Voice</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getVoiceInfo(agent.voice_name).label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Language</span>
                    <span className="text-sm font-medium text-gray-900">
                      {LANGUAGES.find(l => l.value === agent.language_code)?.label || agent.language_code}
                    </span>
                  </div>

                  {agent.twilio_phone_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Phone</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {agent.twilio_phone_number}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Hours</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatBusinessHours(agent.business_hours_start, agent.business_hours_end)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Max Calls</span>
                    <span className="text-sm font-medium text-gray-900">
                      {agent.max_concurrent_calls}
                    </span>
                  </div>

                  {agent.escalation_enabled && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Escalation</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Enabled
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-xs text-gray-500">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Created {new Date(agent.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No AI agents yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first AI agent to start handling calls.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Create Agent
            </button>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <CreateAgentModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAgents}
        />
      )}

      {/* Edit Agent Modal */}
      {showEditModal && selectedAgent && (
        <EditAgentModal
          agent={selectedAgent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAgent(null);
          }}
          onSuccess={loadAgents}
        />
      )}
    </div>
  );
}

// Create Agent Modal Component
function CreateAgentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agent_type: 'customer_service',
    voice_name: 'Puck',
    language_code: 'en-US',
    system_instruction: '',
    twilio_phone_number: '',
    twilio_webhook_url: '',
    max_concurrent_calls: 1,
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    business_days: [1, 2, 3, 4, 5],
    timezone: 'UTC',
    escalation_enabled: false,
    escalation_type: 'voicemail',
    escalation_phone_number: '',
    escalation_email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await DatabaseService.createAIAgent({
        ...formData,
        profile_id: user.id,
        is_active: true,
        agent_type: formData.agent_type as AIAgent['agent_type'],
        voice_name: formData.voice_name as AIAgent['voice_name'],
        escalation_type: formData.escalation_type as AIAgent['escalation_type']
      });
      
      toast.success('AI agent created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create AI agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Create New AI Agent</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Customer Service Agent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Handles customer inquiries and support requests..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Type</label>
                  <select
                    value={formData.agent_type}
                    onChange={(e) => setFormData({ ...formData, agent_type: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {AGENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Voice</label>
                  <select
                    value={formData.voice_name}
                    onChange={(e) => setFormData({ ...formData, voice_name: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {VOICE_OPTIONS.map(voice => (
                      <option key={voice.value} value={voice.value}>
                        {voice.label} - {voice.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Language</label>
                  <select
                    value={formData.language_code}
                    onChange={(e) => setFormData({ ...formData, language_code: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Twilio Phone Number</label>
                  <input
                    type="tel"
                    value={formData.twilio_phone_number}
                    onChange={(e) => setFormData({ ...formData, twilio_phone_number: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
                  <input
                    type="url"
                    value={formData.twilio_webhook_url}
                    onChange={(e) => setFormData({ ...formData, twilio_webhook_url: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://your-domain.com/webhook"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Concurrent Calls</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_concurrent_calls}
                    onChange={(e) => setFormData({ ...formData, max_concurrent_calls: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={formData.business_hours_start}
                      onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={formData.business_hours_end}
                      onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* System Instruction */}
            <div>
              <label className="block text-sm font-medium text-gray-700">System Instruction</label>
              <textarea
                value={formData.system_instruction}
                onChange={(e) => setFormData({ ...formData, system_instruction: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="You are a professional AI assistant. Be helpful, polite, and efficient..."
              />
            </div>

            {/* Escalation Settings */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.escalation_enabled}
                  onChange={(e) => setFormData({ ...formData, escalation_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable escalation to human agents
                </label>
              </div>

              {formData.escalation_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Escalation Type</label>
                    <select
                      value={formData.escalation_type}
                      onChange={(e) => setFormData({ ...formData, escalation_type: e.target.value as any })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="human_agent">Human Agent</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="callback">Callback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Escalation Phone</label>
                    <input
                      type="tel"
                      value={formData.escalation_phone_number}
                      onChange={(e) => setFormData({ ...formData, escalation_phone_number: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Agent Modal Component (similar structure to Create, but with existing data)
function EditAgentModal({ 
  agent, 
  onClose, 
  onSuccess 
}: { 
  agent: AIAgent; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description || '',
    agent_type: agent.agent_type,
    voice_name: agent.voice_name,
    language_code: agent.language_code,
    system_instruction: agent.system_instruction || '',
    twilio_phone_number: agent.twilio_phone_number || '',
    twilio_webhook_url: agent.twilio_webhook_url || '',
    max_concurrent_calls: agent.max_concurrent_calls,
    business_hours_start: agent.business_hours_start || '09:00',
    business_hours_end: agent.business_hours_end || '17:00',
    business_days: agent.business_days || [1, 2, 3, 4, 5],
    timezone: agent.timezone,
    escalation_enabled: agent.escalation_enabled,
    escalation_type: agent.escalation_type || 'voicemail',
    escalation_phone_number: agent.escalation_phone_number || '',
    escalation_email: agent.escalation_email || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await DatabaseService.updateAIAgent(agent.id, formData);
      
      toast.success('AI agent updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update AI agent');
    } finally {
      setLoading(false);
    }
  };

  // Similar form structure as CreateAgentModal but with update functionality
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Edit AI Agent</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Same form fields as CreateAgentModal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Type</label>
                  <select
                    value={formData.agent_type}
                    onChange={(e) => setFormData({ ...formData, agent_type: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {AGENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Voice</label>
                  <select
                    value={formData.voice_name}
                    onChange={(e) => setFormData({ ...formData, voice_name: e.target.value as any })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {VOICE_OPTIONS.map(voice => (
                      <option key={voice.value} value={voice.value}>
                        {voice.label} - {voice.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Twilio Phone Number</label>
                  <input
                    type="tel"
                    value={formData.twilio_phone_number}
                    onChange={(e) => setFormData({ ...formData, twilio_phone_number: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Concurrent Calls</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_concurrent_calls}
                    onChange={(e) => setFormData({ ...formData, max_concurrent_calls: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={formData.business_hours_start}
                      onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={formData.business_hours_end}
                      onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">System Instruction</label>
              <textarea
                value={formData.system_instruction}
                onChange={(e) => setFormData({ ...formData, system_instruction: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import VerificationGuard from '../components/VerificationGuard';
import { Menu, Plus, Mail, MessageSquare, Calendar, Send, Clock, CheckCircle2 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  created_at: string;
}

export default function Campaigns() {
  const { business } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<'email' | 'sms'>('sms');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (business) {
      loadCampaigns();
    }
  }, [business]);

  const loadCampaigns = async () => {
    if (!business) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading campaigns:', error);
        throw error;
      }

      if (data) {
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter === 'all') return true;
    return campaign.type === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-500/10 text-gray-400 border-gray-500/20">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateCampaign = async () => {
    if (!business || !campaignName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        business_id: business.id,
        name: campaignName,
        type: campaignType,
        status: 'draft',
        recipient_count: 0
      })
      .select()
      .single();

    setCreating(false);

    if (!error && data) {
      setCampaigns([data, ...campaigns]);
      setShowCreateModal(false);
      setCampaignName('');
      setCampaignType('sms');
    }
  };

  return (
    <VerificationGuard featureName="Campaigns">
      <div className="min-h-screen bg-black flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-400 hover:text-white transition"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Campaigns</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Campaign</span>
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-zinc-800 bg-zinc-900">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex gap-4 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  filter === 'all'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                All Campaigns
              </button>
              <button
                onClick={() => setFilter('email')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                  filter === 'email'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => setFilter('sms')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                  filter === 'sms'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                SMS
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">
                {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === 'all'
                  ? 'Create your first campaign to engage with customers'
                  : `Create your first ${filter} campaign to reach customers`}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          campaign.type === 'email'
                            ? 'bg-blue-500/10'
                            : 'bg-green-500/10'
                        }`}
                      >
                        {campaign.type === 'email' ? (
                          <Mail className="w-6 h-6 text-blue-400" />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white truncate">
                            {campaign.name}
                          </h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Created {formatDate(campaign.created_at)}
                          </span>
                          {campaign.scheduled_for && campaign.status === 'scheduled' && (
                            <span className="flex items-center gap-1.5 text-blue-400">
                              <Clock className="w-4 h-4" />
                              Scheduled for {formatDate(campaign.scheduled_for)}
                            </span>
                          )}
                          {campaign.sent_at && campaign.status === 'sent' && (
                            <span className="flex items-center gap-1.5 text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              Sent {formatDate(campaign.sent_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                          {campaign.recipient_count}
                        </p>
                        <p className="text-xs text-gray-400">Recipients</p>
                      </div>
                      <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-2xl font-bold text-white">Create Campaign</h2>
              <p className="text-gray-400 mt-1">Create a new email or SMS campaign</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Sale Promotion"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Campaign Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCampaignType('sms')}
                    className={`p-4 rounded-lg border-2 transition ${
                      campaignType === 'sms'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <MessageSquare className={`w-6 h-6 mx-auto mb-2 ${
                      campaignType === 'sms' ? 'text-orange-400' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      campaignType === 'sms' ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      SMS
                    </span>
                  </button>
                  <button
                    onClick={() => setCampaignType('email')}
                    className={`p-4 rounded-lg border-2 transition ${
                      campaignType === 'email'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <Mail className={`w-6 h-6 mx-auto mb-2 ${
                      campaignType === 'email' ? 'text-orange-400' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      campaignType === 'email' ? 'text-orange-400' : 'text-gray-400'
                    }`}>
                      Email
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCampaignName('');
                  setCampaignType('sms');
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={!campaignName.trim() || creating}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </VerificationGuard>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import {
  Menu,
  TrendingUp,
  Users,
  Gift,
  Mail,
  ArrowUp,
  ArrowDown,
  Calendar,
  Eye,
  Send
} from 'lucide-react';

interface AnalyticsData {
  totalCustomers: number;
  activePrograms: number;
  campaignsSent: number;
  rewardsRedeemed: number;
  customerGrowth: number;
  engagementRate: number;
  emailsSent: number;
  emailsOpened: number;
  emailOpenRate: number;
  smsSent: number;
}

export default function Analytics() {
  const { business } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalCustomers: 0,
    activePrograms: 0,
    campaignsSent: 0,
    rewardsRedeemed: 0,
    customerGrowth: 0,
    engagementRate: 0,
    emailsSent: 0,
    emailsOpened: 0,
    emailOpenRate: 0,
    smsSent: 0
  });

  useEffect(() => {
    if (business) {
      loadAnalytics();
    }
  }, [business]);

  const loadAnalytics = async () => {
    if (!business) return;

    setLoading(true);

    const [
      customersResult,
      programsResult,
      campaignsResult,
      emailsResult,
      smsResult
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('id', { count: 'exact' })
        .eq('business_id', business.id),
      supabase
        .from('loyalty_programs')
        .select('id', { count: 'exact' })
        .eq('business_id', business.id)
        .eq('status', 'active'),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact' })
        .eq('business_id', business.id)
        .eq('status', 'sent'),
      supabase
        .from('communication_logs')
        .select('opened_at, open_count')
        .eq('business_id', business.id)
        .eq('type', 'email')
        .eq('is_test_email', false),
      supabase
        .from('communication_logs')
        .select('id', { count: 'exact' })
        .eq('business_id', business.id)
        .eq('type', 'sms')
        .eq('is_test_email', false)
    ]);

    const emailsSent = emailsResult.data?.length || 0;
    const emailsOpened = emailsResult.data?.filter(e => e.opened_at !== null).length || 0;
    const emailOpenRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;

    setAnalytics({
      totalCustomers: customersResult.count || 0,
      activePrograms: programsResult.count || 0,
      campaignsSent: campaignsResult.count || 0,
      rewardsRedeemed: 0,
      customerGrowth: 12.5,
      engagementRate: 68.3,
      emailsSent,
      emailsOpened,
      emailOpenRate,
      smsSent: smsResult.count || 0
    });

    setLoading(false);
  };

  const stats = [
    {
      label: 'Total Customers',
      value: analytics.totalCustomers.toLocaleString(),
      change: analytics.customerGrowth,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Active Programs',
      value: analytics.activePrograms.toString(),
      change: 0,
      icon: Gift,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'Campaigns Sent',
      value: analytics.campaignsSent.toString(),
      change: 0,
      icon: Mail,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Engagement Rate',
      value: `${analytics.engagementRate}%`,
      change: 5.2,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ];

  return (
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
                  <h1 className="text-2xl font-bold text-white">Analytics</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    Track your business performance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Last 30 days</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      {stat.change !== 0 && (
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${
                            stat.change > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {stat.change > 0 ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {Math.abs(stat.change)}%
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" />
                  Email Engagement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-3">
                      <Send className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{analytics.emailsSent}</p>
                    <p className="text-sm text-gray-400">Emails Sent</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-3">
                      <Eye className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{analytics.emailsOpened}</p>
                    <p className="text-sm text-gray-400">Emails Opened</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-3">
                      <TrendingUp className="w-8 h-8 text-orange-400" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{analytics.emailOpenRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-400">Open Rate</p>
                  </div>
                </div>
                {analytics.emailsSent === 0 && (
                  <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Send your first email to see engagement metrics</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Customer Growth</h3>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p>Chart visualization coming soon</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Program Performance</h3>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Gift className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p>Chart visualization coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {analytics.totalCustomers === 0 && analytics.campaignsSent === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No activity yet</p>
                      <p className="text-sm mt-2">Start by adding customers or creating campaigns</p>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      Activity feed coming soon
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

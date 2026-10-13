import { useEffect, useState } from 'react';
import { Menu, DollarSign, Users, CreditCard, TrendingUp, AlertCircle, Mail, MessageSquare, ExternalLink, Shield } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { one } from '../lib/relations';

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  totalRevenue: number;
}

interface Tenant {
  id: string;
  email: string;
  company_name: string;
  subscription_status: string;
  credits_remaining: number;
  stripe_price_id: string | null;
  subscription_period_end: string | null;
  tier_name: string;
  price_monthly: string;
}

interface SuperAdmin {
  id: string;
  email: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<TenantStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalRevenue: 0,
  });
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [brevoBalance, setBrevoBalance] = useState<{ sms_credits: number; last_sync_at: string } | null>(null);
  const [dailyAllowance, setDailyAllowance] = useState<{
    remaining_today: number;
    daily_limit: number;
    sent_today: number;
    percentage_used: number;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadBrevoBalance();
    loadDailyAllowance();
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading super admins:', error);
        return;
      }

      if (!data) return;

      setSuperAdmins(data.map((admin) => ({
        id: admin.id,
        email: 'email' in admin && typeof admin.email === 'string' ? admin.email : admin.id,
        created_at: admin.created_at,
      })));
    } catch (err) {
      console.error('Unexpected error loading super admins:', err);
    }
  };

  const loadBrevoBalance = async () => {
    const { data } = await supabase
      .from('brevo_account_balance')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setBrevoBalance(data);
    }
  };

  const loadDailyAllowance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_daily_email_allowance').maybeSingle();
      if (error) throw error;
      if (data && typeof data === 'object' && 'remaining_today' in data) {
        setDailyAllowance(data as {
          remaining_today: number;
          daily_limit: number;
          sent_today: number;
          percentage_used: number;
        });
      }
    } catch (err) {
      console.error('Error loading daily allowance:', err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, company_name, created_at')
        .order('created_at', { ascending: false });

      if (tenantsError) {
        console.error('Error loading tenants:', tenantsError);
        setLoading(false);
        return;
      }

      if (!tenantsData) {
        setLoading(false);
        return;
      }

      const enrichedTenants = await Promise.all(
        tenantsData.slice(0, 5).map(async (tenant) => {
          const { data: business } = await supabase
            .from('businesses')
            .select(`
              email,
              subscription_status,
              credits_remaining,
              subscription_tiers (
                name,
                price_monthly
              )
            `)
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          return {
            id: tenant.id,
            email: business?.email || 'N/A',
            company_name: tenant.company_name,
            subscription_status: business?.subscription_status || 'trial',
            credits_remaining: business?.credits_remaining || 0,
            stripe_price_id: null,
            subscription_period_end: null,
            tier_name: one(business?.subscription_tiers)?.name || 'Free',
            price_monthly: one(business?.subscription_tiers)?.price_monthly || '0',
          };
        })
      );

      setRecentTenants(enrichedTenants);

      const { data: allBusinesses } = await supabase
        .from('businesses')
        .select(`
          subscription_status,
          subscription_tiers (
            price_monthly
          )
        `)
        .not('tenant_id', 'is', null);

      const activeTenantCount = allBusinesses?.filter((b) => b.subscription_status === 'active').length || 0;
      const trialTenantCount = allBusinesses?.filter((b) => b.subscription_status === 'trial').length || 0;
      const totalRevenue = allBusinesses
        ?.filter((b) => b.subscription_status === 'active')
        .reduce((sum, b) => sum + parseFloat(String(one(b.subscription_tiers)?.price_monthly || '0')), 0) || 0;

      setStats({
        totalTenants: tenantsData.length,
        activeTenants: activeTenantCount,
        trialTenants: trialTenantCount,
        totalRevenue,
      });
    } catch (err) {
      console.error('Unexpected error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'trial':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'canceled':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      <SuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white transition"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Overview of all tenants and revenue</p>
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
                <StatCard
                  icon={<Users className="w-6 h-6" />}
                  label="Total Tenants"
                  value={stats.totalTenants}
                  color="blue"
                />
                <StatCard
                  icon={<CreditCard className="w-6 h-6" />}
                  label="Active Subscriptions"
                  value={stats.activeTenants}
                  color="green"
                />
                <StatCard
                  icon={<AlertCircle className="w-6 h-6" />}
                  label="Trial Accounts"
                  value={stats.trialTenants}
                  color="yellow"
                />
                <StatCard
                  icon={<DollarSign className="w-6 h-6" />}
                  label="Monthly Revenue"
                  value={`$${stats.totalRevenue.toFixed(2)}`}
                  color="orange"
                />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <h2 className="text-xl font-bold text-white">Recent Tenants</h2>
                  <p className="text-sm text-gray-400 mt-1">Latest businesses that signed up</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Tier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Credits
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          MRR
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {recentTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-zinc-800/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{tenant.company_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">{tenant.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">{tenant.tier_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                tenant.subscription_status
                              )}`}
                            >
                              {tenant.subscription_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-400">{tenant.credits_remaining}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-400">
                              ${parseFloat(tenant.price_monthly).toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {dailyAllowance && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Mail className="w-5 h-5 text-orange-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">Daily Email Allowance</h3>
                    </div>
                    <button
                      onClick={() => navigate('/admin/brevo-balance')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition text-sm"
                    >
                      View Details
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="text-3xl font-bold text-white">
                        {dailyAllowance.remaining_today}
                      </div>
                      <div className="text-lg text-gray-400">left of {dailyAllowance.daily_limit} daily</div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {dailyAllowance.sent_today} emails sent today
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-3 text-xs flex rounded-lg bg-zinc-800">
                      <div
                        style={{ width: `${Math.min(dailyAllowance.percentage_used, 100)}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all ${
                          dailyAllowance.percentage_used >= 100
                            ? 'bg-red-500'
                            : dailyAllowance.percentage_used >= 83
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      ></div>
                    </div>
                  </div>
                  {brevoBalance && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3 h-3 text-orange-400" />
                            <span className="text-xs text-gray-400">SMS Credits</span>
                          </div>
                          <div className="text-lg font-bold text-white">
                            {brevoBalance.sms_credits.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Last updated</div>
                          <div className="text-xs text-gray-500">
                            {new Date(brevoBalance.last_sync_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Revenue Insights</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Active MRR</span>
                      <span className="text-white font-medium">${stats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Avg Revenue per Tenant</span>
                      <span className="text-white font-medium">
                        ${stats.activeTenants > 0 ? (stats.totalRevenue / stats.activeTenants).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Conversion Rate</span>
                      <span className="text-white font-medium">
                        {stats.totalTenants > 0 ? ((stats.activeTenants / stats.totalTenants) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Subscription Health</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Active Subscriptions</span>
                      <span className="text-green-400 font-medium">{stats.activeTenants}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Trial Accounts</span>
                      <span className="text-blue-400 font-medium">{stats.trialTenants}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Tenants</span>
                      <span className="text-white font-medium">{stats.totalTenants}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Shield className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Platform Super Admins</h2>
                      <p className="text-sm text-gray-400 mt-1">System administrators with full access</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          User ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {superAdmins.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                            No super admins found
                          </td>
                        </tr>
                      ) : (
                        superAdmins.map((admin) => (
                          <tr key={admin.id} className="hover:bg-zinc-800/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-red-400" />
                                <span className="font-mono text-xs text-gray-300">{admin.id}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-400">
                                {new Date(admin.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Menu, DollarSign, Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

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

export default function SuperAdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<TenantStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalRevenue: 0,
  });
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const { data: tenants, error } = await supabase
      .from('businesses')
      .select(`
        id,
        email,
        company_name,
        subscription_status,
        credits_remaining,
        stripe_price_id,
        subscription_period_end,
        tier_id,
        subscription_tiers (
          name,
          price_monthly
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
      return;
    }

    if (tenants) {
      const formattedTenants = tenants.map((t: any) => ({
        id: t.id,
        email: t.email,
        company_name: t.company_name,
        subscription_status: t.subscription_status,
        credits_remaining: t.credits_remaining,
        stripe_price_id: t.stripe_price_id,
        subscription_period_end: t.subscription_period_end,
        tier_name: t.subscription_tiers?.name || 'Unknown',
        price_monthly: t.subscription_tiers?.price_monthly || '0',
      }));

      setRecentTenants(formattedTenants.slice(0, 5));

      const totalRevenue = formattedTenants
        .filter((t: Tenant) => t.subscription_status === 'active')
        .reduce((sum: number, t: Tenant) => sum + parseFloat(t.price_monthly), 0);

      setStats({
        totalTenants: tenants.length,
        activeTenants: tenants.filter((t: any) => t.subscription_status === 'active').length,
        trialTenants: tenants.filter((t: any) => t.subscription_status === 'trial').length,
        totalRevenue,
      });
    }

    setLoading(false);
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

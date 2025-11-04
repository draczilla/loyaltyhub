import { useEffect, useState } from 'react';
import { Menu, Search, ExternalLink, CreditCard, Calendar, Mail, Building } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

interface Tenant {
  id: string;
  email: string;
  company_name: string;
  subscription_status: string;
  credits_remaining: number;
  stripe_price_id: string | null;
  subscription_period_end: string | null;
  created_at: string;
  tier_name: string;
  price_monthly: string;
  usage_customers: number;
  usage_sms_monthly: number;
}

export default function SuperAdminTenants() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchQuery, statusFilter, tenants]);

  const loadTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id,
        email,
        company_name,
        subscription_status,
        credits_remaining,
        stripe_price_id,
        subscription_period_end,
        created_at,
        usage_customers,
        usage_sms_monthly,
        tier_id,
        subscription_tiers (
          name,
          price_monthly
        )
      `)
      .eq('is_super_admin', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedTenants = data.map((t: any) => ({
        id: t.id,
        email: t.email,
        company_name: t.company_name,
        subscription_status: t.subscription_status,
        credits_remaining: t.credits_remaining,
        stripe_price_id: t.stripe_price_id,
        subscription_period_end: t.subscription_period_end,
        created_at: t.created_at,
        tier_name: t.subscription_tiers?.name || 'Unknown',
        price_monthly: t.subscription_tiers?.price_monthly || '0',
        usage_customers: t.usage_customers,
        usage_sms_monthly: t.usage_sms_monthly,
      }));

      setTenants(formattedTenants);
      setFilteredTenants(formattedTenants);
    }

    setLoading(false);
  };

  const filterTenants = () => {
    let filtered = tenants;

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.subscription_status === statusFilter);
    }

    setFilteredTenants(filtered);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
                <h1 className="text-2xl font-bold text-white">Tenant Management</h1>
                <p className="text-gray-400 text-sm mt-1">View and manage all business accounts</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
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
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-zinc-800/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{tenant.company_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{tenant.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{tenant.tier_name}</div>
                          <div className="text-xs text-gray-500">${parseFloat(tenant.price_monthly).toFixed(2)}/mo</div>
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
                          <div className="text-sm text-gray-400">
                            {tenant.usage_customers} customers
                          </div>
                          <div className="text-xs text-gray-500">{tenant.usage_sms_monthly} SMS</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">{formatDate(tenant.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTenant(tenant)}
                            className="text-orange-400 hover:text-orange-300 transition"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTenants.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No tenants found</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedTenant && (
        <TenantDetailsModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}
    </div>
  );
}

function TenantDetailsModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">{tenant.company_name}</h2>
            <p className="text-sm text-gray-400 mt-1">Tenant Details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </div>
                <p className="text-white">{tenant.email}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Building className="w-4 h-4" />
                  <span>Company</span>
                </div>
                <p className="text-white">{tenant.company_name}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Subscription Tier</span>
                </div>
                <p className="text-white">
                  {tenant.tier_name} - ${parseFloat(tenant.price_monthly).toFixed(2)}/month
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Created</span>
                </div>
                <p className="text-white">
                  {new Date(tenant.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Subscription Status</h3>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    tenant.subscription_status === 'active'
                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : tenant.subscription_status === 'trial'
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                  }`}
                >
                  {tenant.subscription_status}
                </span>
                {tenant.subscription_period_end && (
                  <p className="text-xs text-gray-500 mt-2">
                    Renews: {new Date(tenant.subscription_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Credits</h3>
                <p className="text-2xl font-bold text-orange-400">{tenant.credits_remaining}</p>
              </div>

              <div className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Customers</span>
                    <span className="text-white font-medium">{tenant.usage_customers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">SMS Sent</span>
                    <span className="text-white font-medium">{tenant.usage_sms_monthly}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {tenant.stripe_price_id && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2">Stripe Integration</h3>
              <p className="text-sm text-gray-400">
                <span className="font-medium">Price ID:</span> {tenant.stripe_price_id}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

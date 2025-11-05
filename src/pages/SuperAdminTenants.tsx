import { useEffect, useState } from 'react';
import { Menu, Search, ExternalLink, CreditCard, Calendar, Mail, Building, Download, Trash2, AlertTriangle } from 'lucide-react';
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
        <TenantDetailsModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onDeleted={loadTenants}
        />
      )}
    </div>
  );
}

function TenantDetailsModal({ tenant, onClose, onDeleted }: { tenant: Tenant; onClose: () => void; onDeleted: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [dataExported, setDataExported] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmDataExported, setConfirmDataExported] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportSummary, setExportSummary] = useState<any>(null);

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-tenant-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tenant_id: tenant.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export data');
      }

      const result = await response.json();
      setExportSummary(result.summary);

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-${tenant.company_name.replace(/\s+/g, '-')}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDataExported(true);
      setShowDataExport(false);
      alert('Data exported successfully! The download should start automatically.');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!confirmDataExported) {
      alert('Please confirm that data has been exported before proceeding with deletion.');
      return;
    }

    const finalConfirm = window.confirm(
      `FINAL CONFIRMATION: Are you absolutely sure you want to permanently delete ${tenant.company_name}?\n\nThis action CANNOT be undone. All data will be permanently removed.\n\nType the tenant name to confirm.`
    );

    if (!finalConfirm) return;

    const typedName = window.prompt(`Type "${tenant.company_name}" to confirm deletion:`);
    if (typedName !== tenant.company_name) {
      alert('Tenant name does not match. Deletion cancelled.');
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-tenant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: tenant.id,
            reason: deletionReason || 'No reason provided',
            data_exported: dataExported,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tenant');
      }

      alert(`Tenant "${tenant.company_name}" has been successfully deleted.`);
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (showDataExport) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => !exportingData && setShowDataExport(false)}>
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white">Export Tenant Data</h2>
            <p className="text-sm text-gray-400 mt-1">Download all data for GDPR compliance</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                This will export all tenant data including customers, loyalty programs, campaigns, communications, and more.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">Important</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Export data before deletion to comply with GDPR data portability requirements.
                  </p>
                </div>
              </div>
            </div>
            {exportSummary && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <p className="text-sm font-medium text-white mb-2">Last Export Summary:</p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Businesses: {exportSummary.data_counts.businesses}</p>
                  <p>Customers: {exportSummary.data_counts.customers}</p>
                  <p>Loyalty Programs: {exportSummary.data_counts.loyalty_programs}</p>
                  <p>Communications: {exportSummary.data_counts.communication_logs}</p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => setShowDataExport(false)}
              disabled={exportingData}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExportData}
              disabled={exportingData}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exportingData ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-red-400">Delete Tenant</h2>
            <p className="text-sm text-gray-400 mt-1">Permanently remove {tenant.company_name}</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Warning: This action is irreversible</p>
                  <p className="text-xs text-gray-400 mt-1">
                    All data associated with this tenant will be permanently deleted, including customers, programs, campaigns, and communications.
                  </p>
                </div>
              </div>
            </div>

            {!dataExported && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  Data has not been exported. It is recommended to export data before deletion for GDPR compliance.
                </p>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setShowDataExport(true);
                  }}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Export Data Now
                </button>
              </div>
            )}

            {dataExported && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm text-green-400">
                  Data has been exported successfully.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter reason for audit trail..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                rows={3}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmDataExported}
                onChange={(e) => setConfirmDataExported(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-400">
                I confirm that data has been {dataExported ? 'exported' : 'backed up or is not needed'} and I understand this deletion is permanent and cannot be undone.
              </span>
            </label>
          </div>
          <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTenant}
              disabled={deleting || !confirmDataExported}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          <div className="border-t border-zinc-800 pt-6 space-y-3">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Tenant Management Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDataExport(true)}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Export All Data</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete Tenant</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Export data before deletion to comply with GDPR requirements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

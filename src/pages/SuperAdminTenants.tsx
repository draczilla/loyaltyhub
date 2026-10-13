import { useCallback, useEffect, useState } from 'react';
import { Menu, Search, ExternalLink, CreditCard, Calendar, Mail, Building, Download, Trash2, AlertTriangle, Phone, Plus } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';
import { one } from '../lib/relations';

interface Tenant {
  id: string;
  company_name: string;
  logo_url: string | null;
  primary_color: string;
  admin_user_id: string;
  admin_email: string;
  admin_phone: string | null;
  created_at: string;
  updated_at: string;
  business_count: number;
  member_count: number;
  total_customers: number;
  total_sms_sent: number;
  subscription_status: string;
  tier_name: string;
  price_monthly: string;
  credits_remaining: number;
}

export default function SuperAdminTenants() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id,
          company_name,
          logo_url,
          primary_color,
          admin_user_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tenants:', error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setTenants([]);
        setFilteredTenants([]);
        setLoading(false);
        return;
      }

      const enrichedTenants = await Promise.all(
        data.map(async (tenant) => {
          const { data: businesses } = await supabase
            .from('businesses')
            .select(`
              id,
              email,
              phone,
              subscription_status,
              credits_remaining,
              usage_customers,
              usage_sms_monthly,
              tier_id,
              subscription_tiers (
                name,
                price_monthly
              )
            `)
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          const { data: members } = await supabase
            .from('tenant_members')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('status', 'active');

          const { data: allBusinesses } = await supabase
            .from('businesses')
            .select('id, usage_customers, usage_sms_monthly')
            .eq('tenant_id', tenant.id);

          const businessCount = allBusinesses?.length || 0;
          const totalCustomers = allBusinesses?.reduce((sum, b) => sum + (b.usage_customers || 0), 0) || 0;
          const totalSmsSent = allBusinesses?.reduce((sum, b) => sum + (b.usage_sms_monthly || 0), 0) || 0;

          return {
            id: tenant.id,
            company_name: tenant.company_name,
            logo_url: tenant.logo_url,
            primary_color: tenant.primary_color,
            admin_user_id: tenant.admin_user_id,
            admin_email: businesses?.email || 'N/A',
            admin_phone: businesses?.phone || null,
            created_at: tenant.created_at,
            updated_at: tenant.updated_at,
            business_count: businessCount,
            member_count: members?.length || 0,
            total_customers: totalCustomers,
            total_sms_sent: totalSmsSent,
            subscription_status: businesses?.subscription_status || 'trial',
            tier_name: one(businesses?.subscription_tiers)?.name || 'Free',
            price_monthly: String(one(businesses?.subscription_tiers)?.price_monthly || '0'),
            credits_remaining: businesses?.credits_remaining || 0,
          };
        })
      );

      setTenants(enrichedTenants);
      setFilteredTenants(enrichedTenants);
    } catch (err) {
      console.error('Unexpected error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filterTenants = useCallback(() => {
    let filtered = tenants;

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.admin_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.admin_phone && t.admin_phone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.subscription_status === statusFilter);
    }

    setFilteredTenants(filtered);
  }, [tenants, searchQuery, statusFilter]);

  useEffect(() => {
    filterTenants();
  }, [filterTenants]);

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
                <p className="text-gray-400 text-sm mt-1">View and manage all tenant organizations</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Company</span>
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tenant name, admin email, or phone..."
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
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Admin Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Businesses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Total Usage
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
                          <div className="text-xs text-gray-500">{tenant.member_count} member{tenant.member_count !== 1 ? 's' : ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {tenant.admin_email}
                          </div>
                          {tenant.admin_phone && (
                            <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {tenant.admin_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{tenant.business_count}</div>
                          <div className="text-xs text-gray-500">business{tenant.business_count !== 1 ? 'es' : ''}</div>
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
                          <div className="text-sm text-gray-400">
                            {tenant.total_customers} customers
                          </div>
                          <div className="text-xs text-gray-500">{tenant.total_sms_sent} SMS</div>
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
          onUpdated={loadTenants}
        />
      )}

      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadTenants}
        />
      )}
    </div>
  );
}

function TenantDetailsModal({ tenant, onClose, onDeleted, onUpdated }: { tenant: Tenant; onClose: () => void; onDeleted: () => void; onUpdated: () => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [dataExported, setDataExported] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmDataExported, setConfirmDataExported] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportSummary, setExportSummary] = useState<{
    data_counts: {
      businesses: number;
      customers: number;
      loyalty_programs: number;
      communication_logs: number;
    };
  } | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(tenant.admin_phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [syncingToBrevo, setSyncingToBrevo] = useState(false);

  const handleUpdatePhone = async () => {
    setSavingPhone(true);
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('id', tenant.admin_user_id)
        .maybeSingle();

      if (!business) {
        throw new Error('Admin business not found');
      }

      const { error } = await supabase
        .from('businesses')
        .update({ phone: phoneValue || null })
        .eq('id', business.id);

      if (error) throw error;

      alert('Phone number updated successfully');
      setEditingPhone(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating phone:', error);
      alert(`Failed to update phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSyncToBrevo = async () => {
    if (!phoneValue) {
      alert('Please add a phone number before syncing to Brevo');
      return;
    }

    setSyncingToBrevo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('id', tenant.admin_user_id)
        .maybeSingle();

      if (!business) {
        throw new Error('Admin business not found');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-business-to-brevo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: business.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync to Brevo');
      }

      alert('Business contact successfully synced to Brevo contact list');
    } catch (error) {
      console.error('Brevo sync error:', error);
      alert(`Failed to sync to Brevo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingToBrevo(false);
    }
  };

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

      const result = await response.json() as {
        summary: {
          data_counts: {
            businesses: number;
            customers: number;
            loyalty_programs: number;
            communication_logs: number;
          };
        };
        data: unknown;
      };
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
                  <Building className="w-4 h-4" />
                  <span>Tenant Name</span>
                </div>
                <p className="text-white">{tenant.company_name}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Admin Email</span>
                </div>
                <p className="text-white">{tenant.admin_email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Mobile Number</span>
                  </div>
                  {!editingPhone && (
                    <button
                      onClick={() => setEditingPhone(true)}
                      className="text-orange-400 hover:text-orange-300 text-xs"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingPhone ? (
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      placeholder="+1234567890"
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    <button
                      onClick={handleUpdatePhone}
                      disabled={savingPhone}
                      className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 text-sm"
                    >
                      {savingPhone ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPhone(false);
                        setPhoneValue(tenant.admin_phone || '');
                      }}
                      disabled={savingPhone}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-white">{tenant.admin_phone || 'Not set'}</p>
                    {tenant.admin_phone && (
                      <button
                        onClick={handleSyncToBrevo}
                        disabled={syncingToBrevo}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition disabled:opacity-50"
                      >
                        {syncingToBrevo ? 'Syncing...' : 'Sync to Brevo Contact List'}
                      </button>
                    )}
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Building className="w-4 h-4" />
                  <span>Businesses</span>
                </div>
                <p className="text-white">{tenant.business_count} business{tenant.business_count !== 1 ? 'es' : ''}</p>
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
              </div>

              <div className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Credits</h3>
                <p className="text-2xl font-bold text-orange-400">{tenant.credits_remaining}</p>
              </div>

              <div className="bg-black/50 border border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Total Usage Across All Businesses</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Customers</span>
                    <span className="text-white font-medium">{tenant.total_customers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total SMS Sent</span>
                    <span className="text-white font-medium">{tenant.total_sms_sent}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Team Members</span>
                    <span className="text-white font-medium">{tenant.member_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tierId, setTierId] = useState('');
  const [tiers, setTiers] = useState<Array<{ id: string; name: string; price_monthly: number | string }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadTiers = useCallback(async () => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (!error && data) {
      setTiers(data.map((tier) => ({
        id: tier.id,
        name: tier.name,
        price_monthly: tier.price_monthly,
      })));
      if (data.length > 0) {
        setTierId(data[0].id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const validatePhone = (phone: string) => {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  const handleCreate = async () => {
    if (!companyName.trim()) {
      alert('Company name is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      alert('Valid email address is required');
      return;
    }

    if (phone && !validatePhone(phone)) {
      alert('Phone number must be in E.164 format (e.g., +1234567890)');
      return;
    }

    if (!tierId) {
      alert('Please select a subscription tier');
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-company`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            tierId: tierId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create company');
      }

      const brevoMessage = phone.trim()
        ? (result.brevoSynced
          ? '\n\nThe mobile number has been synced to Brevo contact list.'
          : '\n\nNote: Brevo sync was attempted but may have failed (non-critical).')
        : '';

      alert(`Company created successfully!${brevoMessage}\n\nLogin credentials:\nEmail: ${email}\nPassword: ${result.password}\n\nPlease save these credentials and share them with the client.`);
      onCreated();
      onClose();
    } catch (error) {
      console.error('Error creating company:', error);
      alert(`Failed to create company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Company</h2>
            <p className="text-sm text-gray-400 mt-1">Manually add a new business account</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  E.164 format required (e.g., +1234567890). Will be synced to Brevo contact list.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subscription Tier <span className="text-red-400">*</span>
                </label>
                <select
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} - ${parseFloat(String(tier.price_monthly)).toFixed(2)}/month
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-400">
                    <p className="text-blue-400 font-medium mb-1">Important:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>A secure random password will be generated automatically</li>
                      <li>Login credentials will be displayed after creation - save them securely</li>
                      <li>The company will be created with trial status</li>
                      <li>Mobile number (if provided) will be synced to Brevo contact list</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Company</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

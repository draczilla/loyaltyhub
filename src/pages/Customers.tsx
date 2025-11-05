import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Search, Plus, User, Mail, Phone, Calendar, Gift, Upload, MessageSquare, RefreshCw, Check, XCircle, Clock } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';
import UploadCustomersModal from '../components/UploadCustomersModal';
import FastEmailModal from '../components/FastEmailModal';
import QuickSmsModal from '../components/QuickSmsModal';

interface Customer {
  id: string;
  unique_customer_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  total_points: number;
  total_visits: number;
  opted_in_sms: boolean;
  created_at: string;
  brevo_contact_id: string | null;
  brevo_sync_status: string | null;
  brevo_synced_at: string | null;
}

export default function Customers() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingCustomerId, setSyncingCustomerId] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);

  useEffect(() => {
    if (business) {
      loadCustomers();
    }
  }, [business]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(
        (customer) =>
          customer.unique_customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    if (!business) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
      setFilteredCustomers(data);
    }
    setLoading(false);
  };

  const handleCustomerAdded = () => {
    loadCustomers();
    setShowAddModal(false);
  };

  const handleCustomersUploaded = () => {
    loadCustomers();
    setShowUploadModal(false);
  };

  const handleFastEmail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEmailModal(true);
  };

  const handleQuickSms = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowSmsModal(true);
  };

  const handleCommunicationSuccess = () => {
    setShowEmailModal(false);
    setShowSmsModal(false);
    setSelectedCustomer(null);
  };

  const handleSyncToBrevo = async (customer: Customer) => {
    if (!business || !customer.phone) return;

    setSyncingCustomerId(customer.id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-customer-to-brevo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            customerId: customer.id,
            businessId: business.id,
          }),
        }
      );

      if (response.ok) {
        loadCustomers();
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncingCustomerId(null);
    }
  };

  const handleBulkSyncToBrevo = async () => {
    if (!business || bulkSyncing) return;

    const customersWithPhone = customers.filter(c => c.phone && (!c.brevo_sync_status || c.brevo_sync_status === 'failed'));
    if (customersWithPhone.length === 0) {
      alert('No customers to sync. All customers with phone numbers are already synced.');
      return;
    }

    if (!confirm(`Sync ${customersWithPhone.length} customers to Brevo?`)) return;

    setBulkSyncing(true);

    const headers = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    for (const customer of customersWithPhone) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-customer-to-brevo`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              customerId: customer.id,
              businessId: business.id,
            }),
          }
        );
      } catch (error) {
        console.error(`Sync error for customer ${customer.id}:`, error);
      }
    }

    setBulkSyncing(false);
    loadCustomers();
  };

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
                  <h1 className="text-2xl font-bold text-white">Customers</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkSyncToBrevo}
                  disabled={bulkSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 rounded-lg transition disabled:opacity-50"
                  title="Sync all customers with phone numbers to Brevo"
                >
                  {bulkSyncing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">Sync All to Brevo</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition"
                >
                  <Upload className="w-5 h-5" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Customer</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or customer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Add your first customer to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Add Customer
                </button>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black border-b border-zinc-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Visits
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Brevo Sync
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-zinc-800/50 transition"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">
                                {customer.first_name || customer.last_name
                                  ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                                  : 'No name'}
                              </span>
                            </div>
                            <span className="text-sm text-orange-400 font-mono">
                              {customer.unique_customer_id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Mail className="w-4 h-4" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Phone className="w-4 h-4" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-orange-400" />
                            <span className="text-white font-medium">{customer.total_points}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white">{customer.total_visits}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(customer.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {customer.phone ? (
                            <div className="flex items-center gap-2">
                              {customer.brevo_sync_status === 'synced' ? (
                                <div className="flex items-center gap-2">
                                  <Check className="w-4 h-4 text-green-400" />
                                  <span className="text-xs text-green-400">Synced</span>
                                </div>
                              ) : customer.brevo_sync_status === 'failed' ? (
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-red-400" />
                                  <button
                                    onClick={() => handleSyncToBrevo(customer)}
                                    disabled={syncingCustomerId === customer.id}
                                    className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : customer.brevo_sync_status === 'pending' ? (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  <span className="text-xs text-yellow-400">Pending</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleSyncToBrevo(customer)}
                                  disabled={syncingCustomerId === customer.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 rounded transition disabled:opacity-50"
                                >
                                  {syncingCustomerId === customer.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Sync
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">No phone</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFastEmail(customer)}
                              disabled={!customer.email}
                              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={customer.email ? 'Send Fast Email' : 'No email address'}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleQuickSms(customer)}
                              disabled={!customer.phone}
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={customer.phone ? 'Send Quick SMS' : 'No phone number'}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCustomerAdded}
        />
      )}

      {showUploadModal && (
        <UploadCustomersModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleCustomersUploaded}
        />
      )}

      {showEmailModal && selectedCustomer && business && (
        <FastEmailModal
          customer={selectedCustomer}
          businessId={business.id}
          businessName={business.company_name}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleCommunicationSuccess}
        />
      )}

      {showSmsModal && selectedCustomer && business && (
        <QuickSmsModal
          customer={selectedCustomer}
          businessId={business.id}
          businessName={business.company_name}
          onClose={() => {
            setShowSmsModal(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleCommunicationSuccess}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Gift, QrCode, TrendingUp, Menu, CheckCircle, XCircle, AlertCircle, Mail, Eye, Info, LineChart } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AddCustomerModal from '../components/AddCustomerModal';
import SmsLogsModal from '../components/SmsLogsModal';

interface DashboardStats {
  totalCustomers: number;
  activePrograms: number;
  totalTransactions: number;
  newCustomersThisMonth: number;
  emailsSent: number;
  emailOpenRate: number;
}

interface CustomerGrowthData {
  month: string;
  customers: number;
  growth: number;
  growthPercentage: number;
}

export default function Dashboard() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activePrograms: 0,
    totalTransactions: 0,
    newCustomersThisMonth: 0,
    emailsSent: 0,
    emailOpenRate: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showSmsLogsModal, setShowSmsLogsModal] = useState(false);
  const [paymentNotification, setPaymentNotification] = useState<'success' | 'cancelled' | null>(null);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowthData[]>([]);

  useEffect(() => {
    console.log('[Dashboard] Business context updated:', business?.id);
    if (business) {
      loadDashboardStats();
    }

    const payment = searchParams.get('payment');
    if (payment === 'success') {
      setPaymentNotification('success');
      setSearchParams({});
      setTimeout(() => setPaymentNotification(null), 10000);
    } else if (payment === 'cancelled') {
      setPaymentNotification('cancelled');
      setSearchParams({});
      setTimeout(() => setPaymentNotification(null), 10000);
    }
  }, [business, searchParams, setSearchParams]);

  const loadDashboardStats = async () => {
    if (!business) {
      console.log('[Dashboard] Cannot load stats: business is null');
      return;
    }

    console.log('[Dashboard] Loading stats for business:', business.id);
    try {
      const [customersResult, programsResult, transactionsResult, emailsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, created_at', { count: 'exact' })
          .eq('business_id', business.id),
        supabase
          .from('loyalty_programs')
          .select('id', { count: 'exact' })
          .eq('business_id', business.id)
          .eq('status', 'active'),
        supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .eq('business_id', business.id),
        supabase
          .from('communication_logs')
          .select('id, opened_at', { count: 'exact' })
          .eq('business_id', business.id)
          .eq('type', 'email')
          .eq('status', 'sent'),
      ]);

      // Check for errors
      if (customersResult.error) {
        console.error('[Dashboard] Error loading customers:', customersResult.error);
      }
      if (programsResult.error) {
        console.error('[Dashboard] Error loading programs:', programsResult.error);
      }
      if (transactionsResult.error) {
        console.error('[Dashboard] Error loading transactions:', transactionsResult.error);
      }
      if (emailsResult.error) {
        console.error('[Dashboard] Error loading emails:', emailsResult.error);
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newCustomersThisMonth = customersResult.data?.filter(
        c => new Date(c.created_at) >= startOfMonth
      ).length || 0;

      const totalEmails = emailsResult.count || 0;
      const openedEmails = emailsResult.data?.filter(e => e.opened_at !== null).length || 0;
      const emailOpenRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0;

      setStats({
        totalCustomers: customersResult.count || 0,
      activePrograms: programsResult.count || 0,
      totalTransactions: transactionsResult.count || 0,
      newCustomersThisMonth,
      emailsSent: totalEmails,
        emailOpenRate,
      });

      const growthData = calculateCustomerGrowth(customersResult.data || []);
      setCustomerGrowth(growthData);
      console.log('[Dashboard] Stats loaded successfully');
    } catch (error) {
      console.error('[Dashboard] Failed to load dashboard stats:', error);
    }
  };

  const calculateCustomerGrowth = (customers: Array<{ created_at: string }>) => {
    const now = new Date();
    const monthsData: CustomerGrowthData[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const customersUpToMonth = customers.filter(
        c => new Date(c.created_at) <= monthEnd
      ).length;

      const previousMonthCustomers = monthsData.length > 0 ? monthsData[monthsData.length - 1].customers : 0;
      const growth = customersUpToMonth - previousMonthCustomers;
      const growthPercentage = previousMonthCustomers > 0
        ? Math.round((growth / previousMonthCustomers) * 100)
        : customersUpToMonth > 0 ? 100 : 0;

      monthsData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        customers: customersUpToMonth,
        growth,
        growthPercentage,
      });
    }

    return monthsData;
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
                  <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                  <p className="text-gray-400 text-sm mt-1">Welcome back, {business?.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <span className="text-orange-400 text-sm font-medium">
                    {business?.subscription_status === 'trial' ? 'Trial' : business?.subscription_status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {paymentNotification === 'success' && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-green-400 font-medium mb-1">Payment Successful!</h3>
                <p className="text-gray-300 text-sm">
                  Your subscription has been activated. Thank you for upgrading!
                </p>
              </div>
              <button
                onClick={() => setPaymentNotification(null)}
                className="ml-auto text-gray-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {paymentNotification === 'cancelled' && (
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-400 font-medium mb-1">Payment Cancelled</h3>
                <p className="text-gray-300 text-sm">
                  Your payment was cancelled. You can upgrade anytime from the Subscription page.
                </p>
              </div>
              <button
                onClick={() => setPaymentNotification(null)}
                className="ml-auto text-gray-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {showVerificationBanner && business && (!business.email_verified || !business.phone_verified) && (
            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-blue-400 font-medium mb-1">Unlock Communication Features</h3>
                <p className="text-gray-300 text-sm mb-3">
                  {!business.email_verified && !business.phone_verified && 'Verify your email and phone to access SMS and email features and receive your credits.'}
                  {business.email_verified && !business.phone_verified && 'Verify your phone number to unlock SMS features and receive your credits.'}
                  {!business.email_verified && business.phone_verified && 'Verify your email address to unlock email features and receive your credits.'}
                </p>
                <button
                  onClick={() => navigate('/company-profile')}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition"
                >
                  Complete Verification
                </button>
              </div>
              <button
                onClick={() => setShowVerificationBanner(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {business?.subscription_status === 'trial' && (
            <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-orange-400 font-medium mb-1">Trial Period Active</h3>
                <p className="text-gray-300 text-sm">
                  You're currently on a trial. Upgrade to continue enjoying premium features without interruption.
                </p>
              </div>
              <button
                onClick={() => navigate('/subscription')}
                className="ml-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition"
              >
                View Plans
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Total Customers</h3>
              <p className="text-3xl font-bold text-white">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-500 mt-2">
                +{stats.newCustomersThisMonth} this month
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Gift className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Active Programs</h3>
              <p className="text-3xl font-bold text-white">{stats.activePrograms}</p>
              <p className="text-sm text-gray-500 mt-2">Loyalty programs</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">Transactions</h3>
              <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
              <p className="text-sm text-gray-500 mt-2">All time</p>
            </div>

            <button
              onClick={() => setShowSmsLogsModal(true)}
              className="bg-zinc-900 border border-zinc-800 hover:border-orange-500 rounded-xl p-6 text-left transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm mb-1">SMS Usage</h3>
              <p className="text-3xl font-bold text-white">{business?.usage_sms_monthly || 0}</p>
              <p className="text-sm text-gray-500 mt-2">This month</p>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-white font-semibold">Emails Sent</h3>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats.emailsSent}</p>
                  <p className="text-sm text-gray-400 mt-2">Total emails delivered</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-white font-semibold">Email Open Rate</h3>
                  </div>
                  <p className="text-4xl font-bold text-white">{stats.emailOpenRate}%</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {stats.emailsSent > 0 ? 'Based on tracking pixels' : 'Send emails to see stats'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Customer Growth</h2>
                <p className="text-sm text-gray-400">Total customers over the last 6 months</p>
              </div>
            </div>

            <div className="relative" style={{ height: '300px' }}>
              <div className="absolute inset-0 flex items-end justify-between gap-4 px-4">
                {customerGrowth.map((data, index) => {
                  const maxCustomers = Math.max(...customerGrowth.map(d => d.customers), 10);
                  const heightPercentage = maxCustomers > 0 ? (data.customers / maxCustomers) * 100 : 0;
                  const isLatest = index === customerGrowth.length - 1;
                  const showGrowth = index > 0 && data.growth !== 0;
                  const isPositiveGrowth = data.growth > 0;

                  return (
                    <div key={data.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                      <div className="relative w-full flex flex-col items-center justify-end h-full mb-2">
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-zinc-700 px-3 py-2 rounded-lg z-10 whitespace-nowrap">
                          <div className="text-white font-bold text-sm">{data.customers} customers</div>
                          {showGrowth && (
                            <div className={`text-xs mt-1 ${isPositiveGrowth ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositiveGrowth ? '+' : ''}{data.growth} ({isPositiveGrowth ? '+' : ''}{data.growthPercentage}%)
                            </div>
                          )}
                        </div>

                        {showGrowth && (
                          <div className={`absolute -top-6 text-xs font-medium ${
                            isPositiveGrowth ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isPositiveGrowth ? '+' : ''}{data.growth}
                          </div>
                        )}

                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                            isLatest
                              ? 'bg-gradient-to-t from-orange-500 to-orange-400'
                              : 'bg-gradient-to-t from-orange-500/60 to-orange-400/60 group-hover:from-orange-500 group-hover:to-orange-400'
                          }`}
                          style={{
                            height: `${heightPercentage}%`,
                            minHeight: data.customers > 0 ? '4px' : '0px',
                          }}
                        />
                      </div>
                      <div className="text-center mt-2">
                        <div className={`text-sm font-medium ${isLatest ? 'text-orange-400' : 'text-gray-400'}`}>
                          {data.month}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{data.customers}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {customerGrowth.length > 1 && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Growth Rate:</span>
                    <span className="text-white font-medium">
                      {customerGrowth[customerGrowth.length - 1].customers - customerGrowth[0].customers > 0
                        ? `+${customerGrowth[customerGrowth.length - 1].customers - customerGrowth[0].customers}`
                        : customerGrowth[customerGrowth.length - 1].customers - customerGrowth[0].customers} customers
                    </span>
                  </div>
                  <div className="text-gray-500">Last 6 months</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="p-4 bg-black border border-zinc-700 hover:border-orange-500/50 rounded-lg text-left transition group"
              >
                <Users className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
                <h3 className="text-white font-medium mb-1">Add Customer</h3>
                <p className="text-sm text-gray-400">Manually add a new customer</p>
              </button>

              <button
                onClick={() => navigate('/qr-codes')}
                className="p-4 bg-black border border-zinc-700 hover:border-orange-500/50 rounded-lg text-left transition group"
              >
                <QrCode className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
                <h3 className="text-white font-medium mb-1">Generate QR Code</h3>
                <p className="text-sm text-gray-400">Create sign-up QR code</p>
              </button>

              <button
                onClick={() => navigate('/programs')}
                className="p-4 bg-black border border-zinc-700 hover:border-orange-500/50 rounded-lg text-left transition group"
              >
                <Gift className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition" />
                <h3 className="text-white font-medium mb-1">Create Program</h3>
                <p className="text-sm text-gray-400">Set up a loyalty program</p>
              </button>
            </div>
          </div>
        </main>
      </div>

      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={() => {
            setShowAddCustomerModal(false);
            loadDashboardStats();
          }}
        />
      )}

      {showSmsLogsModal && business && (
        <SmsLogsModal
          businessId={business.id}
          onClose={() => setShowSmsLogsModal(false)}
        />
      )}
    </div>
  );
}

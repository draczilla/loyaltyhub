import { useState, useEffect } from 'react';
import { Menu, RefreshCw, Mail, MessageSquare, DollarSign, TrendingDown, AlertCircle, ExternalLink, Check, X, Clock, Calendar } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

interface BalanceData {
  emailCredits: number;
  smsCredits: number;
  currencyBalance: number;
  totalSpent: number;
  currency: string;
  lastSync: string;
  configured: boolean;
}

interface BalanceHistory {
  id: string;
  email_credits: number;
  sms_credits: number;
  currency_balance: number;
  total_spent: number;
  currency: string;
  last_sync_at: string;
  created_at: string;
}

interface PlatformSettings {
  balance_thresholds: {
    email_credits: number;
    sms_credits: number;
  };
  balance_monitoring_enabled: boolean;
  last_balance_check: string | null;
  daily_email_limit: number;
  daily_email_warning_threshold: number;
}

interface DailyAllowance {
  sent_today: number;
  remaining_today: number;
  daily_limit: number;
  warning_threshold: number;
  percentage_used: number;
  reset_time: string;
}

interface DailyStats {
  date: string;
  email_count: number;
  percentage_of_limit: number;
}

export default function SuperAdminBrevoBalance() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [history, setHistory] = useState<BalanceHistory[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [dailyAllowance, setDailyAllowance] = useState<DailyAllowance | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPlatformSettings(),
      loadBalanceHistory(),
      fetchCurrentBalance(),
      loadDailyAllowance(),
      loadDailyStats(),
    ]);
    setLoading(false);
  };

  const loadPlatformSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('balance_thresholds, balance_monitoring_enabled, last_balance_check, daily_email_limit, daily_email_warning_threshold')
      .limit(1)
      .maybeSingle();

    if (data) {
      setPlatformSettings(data);
    }
  };

  const loadDailyAllowance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_daily_email_allowance').maybeSingle();
      if (error) throw error;
      if (data) {
        setDailyAllowance(data as DailyAllowance);
      }
    } catch (err) {
      console.error('Error loading daily allowance:', err);
    }
  };

  const loadDailyStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_daily_email_stats', { p_days: 30 });
      if (error) throw error;
      if (data) {
        setDailyStats(data);
      }
    } catch (err) {
      console.error('Error loading daily stats:', err);
    }
  };

  const loadBalanceHistory = async () => {
    const { data } = await supabase
      .from('brevo_account_balance')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setHistory(data);
    }
  };

  const fetchCurrentBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-brevo-balance`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch balance');
      }

      setBalance(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      console.error('Error fetching balance:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    await fetchCurrentBalance();
    await loadBalanceHistory();
    await loadDailyAllowance();
    await loadDailyStats();
    setRefreshing(false);
  };

  const getBalanceHealthStatus = (credits: number, threshold: number) => {
    if (credits > threshold) {
      return { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', status: 'Healthy', icon: <Check className="w-5 h-5" /> };
    } else if (credits > threshold * 0.5) {
      return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', status: 'Warning', icon: <AlertCircle className="w-5 h-5" /> };
    } else {
      return { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', status: 'Critical', icon: <X className="w-5 h-5" /> };
    }
  };

  const calculateDaysRemaining = (credits: number, avgDailyUsage: number) => {
    if (avgDailyUsage === 0 || credits === 0) return null;
    return Math.floor(credits / avgDailyUsage);
  };

  const getAverageDailyUsage = (type: 'email' | 'sms') => {
    if (history.length < 2) return 0;

    const recentHistory = history.slice(0, 7);
    if (recentHistory.length < 2) return 0;

    const oldest = recentHistory[recentHistory.length - 1];
    const newest = recentHistory[0];

    const creditDiff = type === 'email'
      ? oldest.email_credits - newest.email_credits
      : oldest.sms_credits - newest.sms_credits;

    const daysDiff = Math.max(1, Math.floor(
      (new Date(newest.created_at).getTime() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ));

    return Math.max(0, creditDiff / daysDiff);
  };

  const emailAvgDaily = getAverageDailyUsage('email');
  const smsAvgDaily = getAverageDailyUsage('sms');

  const emailHealth = balance && platformSettings
    ? getBalanceHealthStatus(balance.emailCredits, platformSettings.balance_thresholds.email_credits)
    : null;

  const smsHealth = balance && platformSettings
    ? getBalanceHealthStatus(balance.smsCredits, platformSettings.balance_thresholds.sms_credits)
    : null;

  const emailDaysRemaining = balance ? calculateDaysRemaining(balance.emailCredits, emailAvgDaily) : null;
  const smsDaysRemaining = balance ? calculateDaysRemaining(balance.smsCredits, smsAvgDaily) : null;

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
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">Brevo Account Balance</h1>
                <p className="text-gray-400 text-sm mt-1">Monitor your Brevo email and SMS credits</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !balance?.configured ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-yellow-400 font-bold mb-2">Brevo API Key Not Configured</h3>
                  <p className="text-gray-400 mb-4">
                    To monitor your Brevo account balance, you need to configure the Brevo API key in your Supabase Edge Function secrets.
                  </p>
                  <a
                    href="/admin/config"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Go to Platform Configuration
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {dailyAllowance && (
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-orange-500/20">
                        <Calendar className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Daily Email Allowance</h3>
                        <p className="text-sm text-gray-400">Brevo free tier: 300 transactional emails per day</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-5xl font-bold text-white">
                          {dailyAllowance.remaining_today}
                        </div>
                        <div className="text-2xl text-gray-400">left of {dailyAllowance.daily_limit} daily</div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {dailyAllowance.sent_today} emails sent today ({dailyAllowance.percentage_used}% used)
                      </div>
                    </div>

                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                            dailyAllowance.percentage_used >= 100
                              ? 'text-red-400 bg-red-500/10'
                              : dailyAllowance.percentage_used >= 83
                              ? 'text-yellow-400 bg-yellow-500/10'
                              : 'text-green-400 bg-green-500/10'
                          }`}>
                            {dailyAllowance.percentage_used >= 100 ? 'Limit Reached' : dailyAllowance.percentage_used >= 83 ? 'Warning' : 'Healthy'}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-4 text-xs flex rounded-lg bg-zinc-800">
                        <div
                          style={{ width: `${Math.min(dailyAllowance.percentage_used, 100)}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ${
                            dailyAllowance.percentage_used >= 100
                              ? 'bg-red-500'
                              : dailyAllowance.percentage_used >= 83
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-orange-500/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Resets at midnight UTC:</span>
                        <span className="text-white font-medium">
                          {new Date(dailyAllowance.reset_time).toLocaleTimeString('en-US', {
                            timeZone: 'UTC',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </span>
                      </div>
                      {dailyAllowance.percentage_used >= 83 && dailyAllowance.remaining_today > 0 && (
                        <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-yellow-400 text-xs">
                            Approaching daily limit. {dailyAllowance.remaining_today} emails remaining until reset.
                          </p>
                        </div>
                      )}
                      {dailyAllowance.remaining_today === 0 && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                          <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-red-400 text-xs">
                            Daily email limit reached. No more emails can be sent until midnight UTC.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`bg-zinc-900 border rounded-xl p-6 ${emailHealth?.borderColor}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${emailHealth?.bgColor}`}>
                        <Mail className={`w-6 h-6 ${emailHealth?.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Email Credits</h3>
                        <p className="text-sm text-gray-400">Available balance</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${emailHealth?.bgColor} border ${emailHealth?.borderColor}`}>
                      {emailHealth?.icon}
                      <span className={`text-sm font-medium ${emailHealth?.color}`}>{emailHealth?.status}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {balance.emailCredits.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">credits remaining</div>
                    </div>

                    {platformSettings && (
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Warning Threshold:</span>
                          <span className="text-yellow-400 font-medium">
                            {platformSettings.balance_thresholds.email_credits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Critical Threshold:</span>
                          <span className="text-red-400 font-medium">
                            {Math.floor(platformSettings.balance_thresholds.email_credits * 0.5).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {emailAvgDaily > 0 && (
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Avg Daily Usage:</span>
                          <span className="text-white font-medium">{Math.round(emailAvgDaily).toLocaleString()} credits/day</span>
                        </div>
                        {emailDaysRemaining !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Est. Days Remaining:</span>
                            <span className={`font-medium ${emailDaysRemaining < 7 ? 'text-red-400' : emailDaysRemaining < 14 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {emailDaysRemaining} days
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`bg-zinc-900 border rounded-xl p-6 ${smsHealth?.borderColor}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${smsHealth?.bgColor}`}>
                        <MessageSquare className={`w-6 h-6 ${smsHealth?.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">SMS Credits</h3>
                        <p className="text-sm text-gray-400">Available balance</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${smsHealth?.bgColor} border ${smsHealth?.borderColor}`}>
                      {smsHealth?.icon}
                      <span className={`text-sm font-medium ${smsHealth?.color}`}>{smsHealth?.status}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-white mb-2">
                        {balance.smsCredits.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">credits remaining</div>
                    </div>

                    {platformSettings && (
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Warning Threshold:</span>
                          <span className="text-yellow-400 font-medium">
                            {platformSettings.balance_thresholds.sms_credits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Critical Threshold:</span>
                          <span className="text-red-400 font-medium">
                            {Math.floor(platformSettings.balance_thresholds.sms_credits * 0.5).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {smsAvgDaily > 0 && (
                      <div className="pt-4 border-t border-zinc-800">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Avg Daily Usage:</span>
                          <span className="text-white font-medium">{Math.round(smsAvgDaily).toLocaleString()} credits/day</span>
                        </div>
                        {smsDaysRemaining !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Est. Days Remaining:</span>
                            <span className={`font-medium ${smsDaysRemaining < 7 ? 'text-red-400' : smsDaysRemaining < 14 ? 'text-yellow-400' : 'text-green-400'}`}>
                              {smsDaysRemaining} days
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Account Balance</h3>
                      <p className="text-sm text-gray-400">Currency balance and spending</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Current Balance</div>
                      <div className="text-2xl font-bold text-white">
                        {balance.currency} {balance.currencyBalance.toFixed(2)}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="text-sm text-gray-400 mb-1">Total Spent</div>
                      <div className="text-xl font-bold text-gray-300">
                        {balance.currency} {balance.totalSpent.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Monitoring Status</h3>
                      <p className="text-sm text-gray-400">Automatic balance checks</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Monitoring Enabled:</span>
                      <span className={`font-medium ${platformSettings?.balance_monitoring_enabled ? 'text-green-400' : 'text-gray-400'}`}>
                        {platformSettings?.balance_monitoring_enabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Last Sync:</span>
                      <span className="text-white font-medium">
                        {new Date(balance.lastSync).toLocaleString()}
                      </span>
                    </div>
                    {platformSettings?.last_balance_check && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Last Check:</span>
                        <span className="text-white font-medium">
                          {new Date(platformSettings.last_balance_check).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Daily Email Usage History</h3>
                    <p className="text-sm text-gray-400">Last 30 days of email sends</p>
                  </div>
                </div>

                {dailyStats.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No email history available yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Emails Sent
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            % of Daily Limit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {dailyStats.map((stat) => (
                          <tr key={stat.date} className="hover:bg-zinc-800/50 transition">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {new Date(stat.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="text-sm text-white font-medium">
                                {stat.email_count}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className={`text-sm font-medium ${
                                stat.percentage_of_limit >= 100
                                  ? 'text-red-400'
                                  : stat.percentage_of_limit >= 83
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                              }`}>
                                {stat.percentage_of_limit}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Balance History</h3>
                    <p className="text-sm text-gray-400">Last 30 balance snapshots</p>
                  </div>
                </div>

                {history.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No balance history available yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-black/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Date/Time
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Email Credits
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            SMS Credits
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Currency Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {history.map((record) => (
                          <tr key={record.id} className="hover:bg-zinc-800/50 transition">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-white">
                                {new Date(record.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(record.created_at).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="text-sm text-white font-medium">
                                {record.email_credits.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="text-sm text-white font-medium">
                                {record.sms_credits.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="text-sm text-white font-medium">
                                {record.currency} {record.currency_balance.toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-400">
                    <p className="text-blue-400 font-medium mb-2">Important Information:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Daily email allowance resets at midnight UTC every day</li>
                      <li>Brevo free tier includes 300 transactional emails per day</li>
                      <li>Warning threshold is set at 250 emails (83% of daily limit)</li>
                      <li>All sent emails are tracked in real-time from communication logs</li>
                      <li>Balance is automatically synced every hour when monitoring is enabled</li>
                      <li>Use the Refresh button to manually fetch the latest balance from Brevo</li>
                    </ul>
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

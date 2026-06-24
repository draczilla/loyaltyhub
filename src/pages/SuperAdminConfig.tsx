import { useEffect, useState } from 'react';
import { Menu, Save, DollarSign, Package, MessageSquare, AlertCircle, Check, Phone, Mail, Key, ExternalLink, RefreshCw, Info, Bell, TrendingDown } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: string;
  max_customers: number;
  max_programs: number;
  max_sms_monthly: number;
  initial_credits: number;
  credit_cost_sms: number;
  credit_cost_email: number;
  stripe_price_id: string | null;
}

interface PlatformSettings {
  id: string;
  primary_sms_provider: 'brevo' | 'twilio';
  sms_provider_status: any;
  alert_email: string | null;
  alert_phone: string | null;
  last_provider_switch_at: string | null;
  provider_switch_count: number;
  balance_thresholds: {
    email_credits: number;
    sms_credits: number;
  };
  balance_monitoring_enabled: boolean;
  last_balance_check: string | null;
  brevo_default_list_id: string | null;
}

export default function SuperAdminConfig() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedTiers, setEditedTiers] = useState<Record<string, Partial<SubscriptionTier>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [smsProvider, setSmsProvider] = useState<'brevo' | 'twilio'>('brevo');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertPhone, setAlertPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [emailThreshold, setEmailThreshold] = useState(1000);
  const [smsThreshold, setSmsThreshold] = useState(500);
  const [balanceMonitoringEnabled, setBalanceMonitoringEnabled] = useState(true);
  const [brevoListId, setBrevoListId] = useState('');

  useEffect(() => {
    loadTiers();
    loadPlatformSettings();
  }, []);

  const loadTiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (!error && data) {
      setTiers(data);
    }
    setLoading(false);
  };

  const loadPlatformSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setPlatformSettings(data);
      setSmsProvider(data.primary_sms_provider || 'brevo');
      setAlertEmail(data.alert_email || '');
      setAlertPhone(data.alert_phone || '');
      setEmailThreshold(data.balance_thresholds?.email_credits || 1000);
      setSmsThreshold(data.balance_thresholds?.sms_credits || 500);
      setBalanceMonitoringEnabled(data.balance_monitoring_enabled ?? true);
      setBrevoListId(data.brevo_default_list_id || '');
    }
  };

  const savePlatformSettings = async () => {
    if (!platformSettings?.id) {
      setMessage({ type: 'error', text: 'Platform settings not loaded yet' });
      return;
    }
    setSavingSettings(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({
        primary_sms_provider: smsProvider,
        alert_email: alertEmail || null,
        alert_phone: alertPhone || null,
        balance_thresholds: {
          email_credits: emailThreshold,
          sms_credits: smsThreshold,
        },
        balance_monitoring_enabled: balanceMonitoringEnabled,
        brevo_default_list_id: brevoListId || null,
      })
      .eq('id', platformSettings.id);

    if (error) {
      setMessage({ type: 'error', text: `Failed to save settings: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Platform settings saved successfully' });
      loadPlatformSettings();
    }

    setSavingSettings(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTierChange = (tierId: string, field: keyof SubscriptionTier, value: string | number) => {
    setEditedTiers((prev) => ({
      ...prev,
      [tierId]: {
        ...prev[tierId],
        [field]: value,
      },
    }));
  };

  const saveTier = async (tierId: string) => {
    const changes = editedTiers[tierId];
    if (!changes || Object.keys(changes).length === 0) return;

    setSaving(true);
    const { error } = await supabase.from('subscription_tiers').update(changes).eq('id', tierId);

    if (error) {
      setMessage({ type: 'error', text: `Failed to save changes: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: 'Tier updated successfully' });
      setEditedTiers((prev) => {
        const newEdited = { ...prev };
        delete newEdited[tierId];
        return newEdited;
      });
      loadTiers();
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const getTierValue = (tier: SubscriptionTier, field: keyof SubscriptionTier) => {
    return editedTiers[tier.id]?.[field] ?? tier[field];
  };

  const refreshProviderStatus = async () => {
    setRefreshingStatus(true);
    await loadPlatformSettings();
    setTimeout(() => setRefreshingStatus(false), 500);
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
                <h1 className="text-2xl font-bold text-white">Platform Configuration</h1>
                <p className="text-gray-400 text-sm mt-1">Manage subscription tiers, SMS providers, and system settings</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">SMS Provider Configuration</h2>
                    <p className="text-sm text-gray-400">Configure primary SMS provider and system alerts</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-white font-medium mb-1">Dual Provider System</h3>
                        <p className="text-sm text-gray-400">
                          LoyaltyHub supports both Brevo and Twilio as SMS providers. Select your primary provider below.
                          If the primary provider fails, the system will automatically fall back to the secondary provider
                          and send you an alert.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4">Provider Selection</h3>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer hover:border-orange-500 transition">
                          <input
                            type="radio"
                            name="smsProvider"
                            value="brevo"
                            checked={smsProvider === 'brevo'}
                            onChange={(e) => setSmsProvider(e.target.value as 'brevo' | 'twilio')}
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">Brevo SMS</div>
                            <div className="text-sm text-gray-400">Primary recommendation</div>
                          </div>
                          {platformSettings?.sms_provider_status?.brevo?.healthy && (
                            <Check className="w-5 h-5 text-green-400" />
                          )}
                        </label>

                        <label className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer hover:border-orange-500 transition">
                          <input
                            type="radio"
                            name="smsProvider"
                            value="twilio"
                            checked={smsProvider === 'twilio'}
                            onChange={(e) => setSmsProvider(e.target.value as 'brevo' | 'twilio')}
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">Twilio SMS</div>
                            <div className="text-sm text-gray-400">Enterprise alternative</div>
                          </div>
                          {platformSettings?.sms_provider_status?.twilio?.healthy && (
                            <Check className="w-5 h-5 text-green-400" />
                          )}
                        </label>
                      </div>

                      {platformSettings && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <h4 className="text-sm font-semibold text-white mb-2">Provider Status</h4>
                          <div className="space-y-2 text-xs text-gray-400">
                            {platformSettings.sms_provider_status?.brevo && (
                              <div className="flex items-center justify-between">
                                <span>Brevo:</span>
                                <span className={platformSettings.sms_provider_status.brevo.healthy ? 'text-green-400' : 'text-red-400'}>
                                  {platformSettings.sms_provider_status.brevo.healthy ? 'Healthy' : 'Unhealthy'}
                                </span>
                              </div>
                            )}
                            {platformSettings.sms_provider_status?.twilio && (
                              <div className="flex items-center justify-between">
                                <span>Twilio:</span>
                                <span className={platformSettings.sms_provider_status.twilio.healthy ? 'text-green-400' : 'text-red-400'}>
                                  {platformSettings.sms_provider_status.twilio.healthy ? 'Healthy' : 'Unhealthy'}
                                </span>
                              </div>
                            )}
                            {platformSettings.provider_switch_count > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                                <span>Provider switches:</span>
                                <span className="text-orange-400">{platformSettings.provider_switch_count}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4">System Alerts</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                            <Mail className="w-4 h-4" />
                            Alert Email
                          </label>
                          <input
                            type="email"
                            value={alertEmail}
                            onChange={(e) => setAlertEmail(e.target.value)}
                            placeholder="admin@company.com"
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1.5">
                            Receive email alerts when SMS provider switches
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                            <Phone className="w-4 h-4" />
                            Alert Phone
                          </label>
                          <input
                            type="tel"
                            value={alertPhone}
                            onChange={(e) => setAlertPhone(e.target.value)}
                            placeholder="+1234567890"
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1.5">
                            Receive SMS alerts when provider switches (E.164 format)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={savePlatformSettings}
                      disabled={savingSettings}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingSettings ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Balance Thresholds</h2>
                    <p className="text-sm text-gray-400">Configure low balance alerts for Brevo credits</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-white font-medium mb-1">Automated Balance Monitoring</h3>
                        <p className="text-sm text-gray-400">
                          When your Brevo email or SMS credits fall below the configured thresholds,
                          the system will automatically send alerts to the configured email and phone number.
                          This helps prevent service interruptions due to insufficient credits.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Credit Threshold
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Alert When Below (credits)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={emailThreshold}
                            onChange={(e) => setEmailThreshold(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1.5">
                            Recommended: 1000 credits for high-volume accounts
                          </p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Warning Alert:</span>
                            <span className="text-yellow-400 font-medium">At threshold</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-gray-400">Critical Alert:</span>
                            <span className="text-red-400 font-medium">At 50% of threshold</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        SMS Credit Threshold
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Alert When Below (credits)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={smsThreshold}
                            onChange={(e) => setSmsThreshold(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1.5">
                            Recommended: 500 credits for high-volume accounts
                          </p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Warning Alert:</span>
                            <span className="text-yellow-400 font-medium">At threshold</span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-gray-400">Critical Alert:</span>
                            <span className="text-red-400 font-medium">At 50% of threshold</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Monitoring Settings
                    </h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer hover:border-orange-500 transition">
                        <input
                          type="checkbox"
                          checked={balanceMonitoringEnabled}
                          onChange={(e) => setBalanceMonitoringEnabled(e.target.checked)}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">Enable Automatic Balance Monitoring</div>
                          <div className="text-sm text-gray-400">
                            Automatically check balance and send alerts when thresholds are reached
                          </div>
                        </div>
                      </label>

                      {platformSettings?.last_balance_check && (
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          Last checked: {new Date(platformSettings.last_balance_check).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-400">
                        <p className="text-yellow-400 font-medium mb-1">Alert Configuration:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Alerts are sent to the email and phone configured in System Alerts above</li>
                          <li>Email alerts are sent for both email and SMS credit warnings</li>
                          <li>SMS alerts are only sent for SMS credit warnings to avoid consuming credits</li>
                          <li>Alerts are throttled to once per 24 hours to prevent spam</li>
                          <li>Balance is checked automatically every hour when monitoring is enabled</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Key className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Brevo SMS Credentials</h2>
                      <p className="text-sm text-gray-400">Manage platform-level Brevo SMS configuration</p>
                    </div>
                  </div>
                  <button
                    onClick={refreshProviderStatus}
                    disabled={refreshingStatus}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingStatus ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm text-gray-400">
                        <p className="text-white font-medium">Unified Platform Account</p>
                        <p>
                          This is a centralized Brevo account used by all tenants for sending SMS messages.
                          Credentials are securely stored in Supabase Edge Function secrets.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Credential Status
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-300">BREVO_API_KEY</div>
                            <div className="text-xs text-gray-500 mt-1">Brevo API authentication key</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {platformSettings?.sms_provider_status?.brevo?.healthy !== undefined ? (
                              platformSettings.sms_provider_status.brevo.healthy ? (
                                <>
                                  <Check className="w-5 h-5 text-green-400" />
                                  <span className="text-sm text-green-400">Configured</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                                  <span className="text-sm text-yellow-400">Check Config</span>
                                </>
                              )
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-red-400" />
                                <span className="text-sm text-red-400">Not Set</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-300">BREVO_SMS_SENDER</div>
                            <div className="text-xs text-gray-500 mt-1">SMS sender ID or phone number</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {platformSettings?.sms_provider_status?.brevo?.healthy !== undefined ? (
                              platformSettings.sms_provider_status.brevo.healthy ? (
                                <>
                                  <Check className="w-5 h-5 text-green-400" />
                                  <span className="text-sm text-green-400">Configured</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                                  <span className="text-sm text-yellow-400">Check Config</span>
                                </>
                              )
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-red-400" />
                                <span className="text-sm text-red-400">Not Set</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {platformSettings?.sms_provider_status?.brevo && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <h4 className="text-sm font-semibold text-white mb-3">Provider Health</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Status:</span>
                              <span className={platformSettings.sms_provider_status.brevo.healthy ? 'text-green-400' : 'text-red-400'}>
                                {platformSettings.sms_provider_status.brevo.healthy ? 'Healthy' : 'Unhealthy'}
                              </span>
                            </div>
                            {platformSettings.sms_provider_status.brevo.last_success_at && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Last Success:</span>
                                <span className="text-gray-300">
                                  {new Date(platformSettings.sms_provider_status.brevo.last_success_at).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {platformSettings.sms_provider_status.brevo.failure_count > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Failure Count:</span>
                                <span className="text-orange-400">{platformSettings.sms_provider_status.brevo.failure_count}</span>
                              </div>
                            )}
                            {platformSettings.sms_provider_status.brevo.last_error && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                                <div className="text-red-400 break-words">{platformSettings.sms_provider_status.brevo.last_error}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-white font-bold mb-4">Setup Instructions</h3>
                      <div className="space-y-4 text-sm text-gray-400">
                        <div>
                          <div className="text-white font-medium mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full text-xs">1</span>
                            Get Brevo Credentials
                          </div>
                          <p className="ml-8">
                            Log in to your Brevo account and navigate to:
                            <br />
                            <span className="text-orange-400">SMTP & API → API Keys</span>
                          </p>
                          <a
                            href="https://app.brevo.com/settings/keys/api"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-8 mt-2 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
                          >
                            Open Brevo Dashboard
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div>
                          <div className="text-white font-medium mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full text-xs">2</span>
                            Configure SMS Sender
                          </div>
                          <p className="ml-8">
                            Your sender can be:
                            <br />
                            • Phone number in E.164 format (e.g., +12345678900)
                            <br />
                            • Alphanumeric sender ID (e.g., YourBrand)
                          </p>
                        </div>

                        <div>
                          <div className="text-white font-medium mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full text-xs">3</span>
                            Add to Supabase Secrets
                          </div>
                          <p className="ml-8">
                            Navigate to your Supabase project:
                            <br />
                            <span className="text-orange-400">Project Settings → Edge Functions → Secrets</span>
                          </p>
                          <div className="ml-8 mt-2 space-y-2">
                            <div className="bg-zinc-900 border border-zinc-700 rounded p-2 font-mono text-xs">
                              <div className="text-gray-500">Name:</div>
                              <div className="text-white">BREVO_API_KEY</div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-700 rounded p-2 font-mono text-xs">
                              <div className="text-gray-500">Name:</div>
                              <div className="text-white">BREVO_SMS_SENDER</div>
                            </div>
                          </div>
                          <a
                            href="https://supabase.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-8 mt-2 inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
                          >
                            Open Supabase Dashboard
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div>
                          <div className="text-white font-medium mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full text-xs">4</span>
                            Test Configuration
                          </div>
                          <p className="ml-8">
                            Use the Test Communications page to verify your Brevo credentials are working correctly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-white font-bold mb-4">Brevo Contact List Configuration</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Configure the default Brevo contact list ID for syncing LoyaltyHub customers. This enables automatic synchronization of customer phone numbers to your Brevo contact list.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Default Brevo List ID
                      </label>
                      <input
                        type="text"
                        value={brevoListId}
                        onChange={(e) => setBrevoListId(e.target.value)}
                        placeholder="Enter Brevo List ID (e.g., 2)"
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Find your list ID in Brevo dashboard under Contacts → Lists. The ID appears in the URL when viewing a list.
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-400">
                        <p className="text-yellow-400 font-medium mb-1">Important Notes:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Credentials are stored securely in Supabase Edge Function secrets</li>
                          <li>Changes to secrets require Edge Functions to restart (automatic)</li>
                          <li>Always test after updating credentials to ensure they work</li>
                          <li>Alphanumeric sender IDs may require pre-registration in some countries</li>
                          <li>Keep your API key secure and never share it publicly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Subscription Tiers</h2>
                    <p className="text-sm text-gray-400">Configure pricing and features for each tier</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {tiers.map((tier) => (
                    <div key={tier.id} className="bg-black/50 border border-zinc-800 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                        {editedTiers[tier.id] && Object.keys(editedTiers[tier.id]).length > 0 && (
                          <button
                            onClick={() => saveTier(tier.id)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Monthly Price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={getTierValue(tier, 'price_monthly') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'price_monthly', e.target.value)}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Stripe Price ID
                          </label>
                          <input
                            type="text"
                            value={getTierValue(tier, 'stripe_price_id') || ''}
                            onChange={(e) => handleTierChange(tier.id, 'stripe_price_id', e.target.value)}
                            placeholder="price_xxxxxxxxxxxxx"
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Max Customers
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'max_customers') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'max_customers', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Max Programs
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'max_programs') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'max_programs', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Max SMS / Month
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'max_sms_monthly') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'max_sms_monthly', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                          <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Initial Credits
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'initial_credits') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'initial_credits', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            SMS Credit Cost
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'credit_cost_sms') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'credit_cost_sms', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email Credit Cost
                          </label>
                          <input
                            type="number"
                            value={getTierValue(tier, 'credit_cost_email') ?? ''}
                            onChange={(e) => handleTierChange(tier.id, 'credit_cost_email', parseInt(e.target.value))}
                            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Stripe Integration</h2>
                    <p className="text-sm text-gray-400">Configure Stripe settings for payments</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-400 mb-2">How to set up Stripe Price IDs:</h3>
                    <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                      <li>Log in to your Stripe Dashboard</li>
                      <li>Navigate to Products and create a product for each tier</li>
                      <li>Add a recurring price to each product</li>
                      <li>Copy the Price ID (starts with price_) and paste it above</li>
                      <li>Save changes to enable Stripe payments for that tier</li>
                    </ol>
                  </div>

                  <div className="text-sm text-gray-400">
                    <p className="mb-2">
                      <span className="font-medium text-white">Webhook URL:</span> {window.location.origin}
                      /stripe-webhook
                    </p>
                    <p>
                      Configure this URL in your Stripe Dashboard to receive subscription events like payment success,
                      cancellation, and renewals.
                    </p>
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

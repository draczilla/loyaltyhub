import { useEffect, useState } from 'react';
import { Menu, Save, DollarSign, Package, MessageSquare, AlertCircle, Check, Phone, Mail } from 'lucide-react';
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
    }
  };

  const savePlatformSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({
        primary_sms_provider: smsProvider,
        alert_email: alertEmail || null,
        alert_phone: alertPhone || null,
      })
      .limit(1);

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
                            value={getTierValue(tier, 'price_monthly')}
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
                            value={getTierValue(tier, 'max_customers')}
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
                            value={getTierValue(tier, 'max_programs')}
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
                            value={getTierValue(tier, 'max_sms_monthly')}
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
                            value={getTierValue(tier, 'initial_credits')}
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
                            value={getTierValue(tier, 'credit_cost_sms')}
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
                            value={getTierValue(tier, 'credit_cost_email')}
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

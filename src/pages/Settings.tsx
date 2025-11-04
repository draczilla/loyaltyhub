import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { Menu, Mail, Save, AlertCircle, Check, TestTube, Eye, EyeOff, Shield, Info } from 'lucide-react';

interface EmailConfig {
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export default function Settings() {
  const { business } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    sendgridApiKey: '',
    fromEmail: '',
    fromName: '',
  });
  const [emailTrackingEnabled, setEmailTrackingEnabled] = useState(true);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [googleProviderEnabled, setGoogleProviderEnabled] = useState(false);
  const [loadingGoogleStatus, setLoadingGoogleStatus] = useState(true);

  useEffect(() => {
    if (business) {
      loadSettings();
      checkGoogleProviderStatus();
    }
  }, [business]);

  const checkGoogleProviderStatus = async () => {
    setLoadingGoogleStatus(true);
    try {
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error('Error checking Google provider status:', error);
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          });

          if (response.ok) {
            const settings = await response.json();
            setGoogleProviderEnabled(settings?.external?.google?.enabled || false);
          }
        } catch (err) {
          setGoogleProviderEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error checking Google provider:', error);
    } finally {
      setLoadingGoogleStatus(false);
    }
  };

  const loadSettings = async () => {
    if (!business) return;

    setLoading(true);
    try {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('email_tracking_enabled')
        .eq('id', business.id)
        .maybeSingle();

      if (businessData) {
        setEmailTrackingEnabled(businessData.email_tracking_enabled ?? true);
      }

      const { data: integration } = await supabase
        .from('integrations')
        .select('id, email_config')
        .eq('business_id', business.id)
        .eq('active', true)
        .maybeSingle();

      if (integration?.email_config) {
        setIntegrationId(integration.id);
        const config = integration.email_config as EmailConfig;
        setEmailConfig({
          sendgridApiKey: config.sendgridApiKey || '',
          fromEmail: config.fromEmail || '',
          fromName: config.fromName || '',
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    if (!business) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!emailConfig.fromEmail || !emailConfig.fromName) {
        throw new Error('From Email and From Name are required');
      }

      const configToSave: EmailConfig = {
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
      };

      if (emailConfig.sendgridApiKey && emailConfig.sendgridApiKey.trim() !== '') {
        configToSave.sendgridApiKey = emailConfig.sendgridApiKey;
      }

      if (integrationId) {
        const { error: updateError } = await supabase
          .from('integrations')
          .update({ email_config: configToSave })
          .eq('id', integrationId);

        if (updateError) throw updateError;
      } else {
        const { data: newIntegration, error: insertError } = await supabase
          .from('integrations')
          .insert({
            business_id: business.id,
            provider: 'sendgrid',
            active: true,
            email_config: configToSave,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (newIntegration) {
          setIntegrationId(newIntegration.id);
        }
      }

      setSuccess('Email configuration saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTracking = async () => {
    if (!business) return;

    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ email_tracking_enabled: !emailTrackingEnabled })
        .eq('id', business.id);

      if (updateError) throw updateError;

      setEmailTrackingEnabled(!emailTrackingEnabled);
      setSuccess('Email tracking setting updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tracking setting');
    }
  };

  const handleTestEmail = async () => {
    if (!business) return;

    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, email')
        .eq('id', business.id)
        .maybeSingle();

      if (!businessData?.email) {
        throw new Error('Business email not found');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business.id,
          customerId: business.id,
          subject: 'Test Email from LoyaltyHub',
          body: `This is a test email from LoyaltyHub.\n\nYour email configuration is working correctly!\n\nBusiness: ${businessData.name}`,
          recipientEmail: businessData.email,
          recipientName: businessData.name,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send test email');
      }

      setSuccess('Test email sent successfully! Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTesting(false);
    }
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400 text-sm mt-1">Configure authentication and integrations</p>
                  </div>
                </div>
              </div>
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

          {success && (
            <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="max-w-3xl space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Google OAuth Provider</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Google sign-in allows users to authenticate using their Google accounts
                </p>

                {loadingGoogleStatus ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-black border border-zinc-700 rounded-lg">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        googleProviderEnabled ? 'bg-green-500/10' : 'bg-yellow-500/10'
                      }`}>
                        <Shield className={`w-6 h-6 ${googleProviderEnabled ? 'text-green-400' : 'text-yellow-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-medium">Provider Status</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            googleProviderEnabled
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {googleProviderEnabled ? 'Configured' : 'Not Configured'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {googleProviderEnabled
                            ? 'Google OAuth is enabled and configured in your Supabase project.'
                            : 'Google OAuth is not configured. Configure it in Supabase Dashboard.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm mb-1">Configuration Steps</h4>
                        <ul className="text-sm text-gray-400 space-y-1.5">
                          <li>1. Create OAuth credentials in Google Cloud Console</li>
                          <li>2. Configure redirect URIs for your Supabase project</li>
                          <li>3. Enable Google provider in Supabase Dashboard</li>
                          <li>4. Add Client ID and Client Secret to Supabase</li>
                        </ul>
                        <a
                          href="https://supabase.com/docs/guides/auth/social-login/auth-google"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-2 transition"
                        >
                          View Documentation →
                        </a>
                      </div>
                    </div>

                    {googleProviderEnabled && (
                      <div className="p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <h4 className="text-white font-medium text-sm mb-3">Features Available</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            <span>Sign in with Google on login page</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            <span>Sign up with Google on registration page</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            <span>Automatic business account creation for OAuth users</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            <span>Seamless authentication flow with Google redirect</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">SendGrid Configuration</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Configure your own SendGrid account for sending emails. Leave API key blank to use platform credentials.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SendGrid API Key (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={emailConfig.sendgridApiKey}
                        onChange={(e) => setEmailConfig({ ...emailConfig, sendgridApiKey: e.target.value })}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition pr-12"
                        placeholder="SG.xxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Get your API key from SendGrid dashboard with Mail Send permissions
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      From Email Address *
                    </label>
                    <input
                      type="email"
                      value={emailConfig.fromEmail}
                      onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                      placeholder="noreply@yourdomain.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Must be verified in your SendGrid account
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      From Name *
                    </label>
                    <input
                      type="text"
                      value={emailConfig.fromName}
                      onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                      placeholder="LoyaltyHub"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Display name shown to email recipients
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveEmailConfig}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Configuration
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleTestEmail}
                      disabled={testing || !emailConfig.fromEmail || !emailConfig.fromName}
                      className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                    >
                      {testing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <TestTube className="w-4 h-4" />
                          Send Test Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Email Tracking</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Enable or disable email open tracking using tracking pixels
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Email Open Tracking</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Track when customers open emails with a 1x1 pixel
                    </p>
                  </div>
                  <button
                    onClick={handleToggleTracking}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                      emailTrackingEnabled ? 'bg-orange-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                        emailTrackingEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

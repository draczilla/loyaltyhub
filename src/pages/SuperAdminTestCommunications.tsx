import { useState } from 'react';
import { Menu, Send, Mail, MessageSquare, AlertCircle, Check, Info } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import { supabase } from '../lib/supabase';

type TabType = 'email' | 'sms';

export default function SuperAdminTestCommunications() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    recipientName: '',
    subject: 'Test Email from LoyaltyHub',
    body: 'This is a test email sent through LoyaltyHub\'s centralized Brevo integration. If you receive this, the integration is working correctly!',
  });

  const [smsForm, setSmsForm] = useState({
    recipientPhone: '',
    message: 'This is a test SMS sent through LoyaltyHub\'s centralized Vonage integration.',
  });

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailForm.subject,
          body: emailForm.body,
          recipientEmail: emailForm.recipientEmail,
          recipientName: emailForm.recipientName,
          isTestEmail: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      setSuccess(`Email sent successfully! Message ID: ${result.messageId || 'N/A'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-sms`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientPhone: smsForm.recipientPhone,
          message: smsForm.message,
          isTestSms: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      setSuccess(`SMS sent successfully! Message ID: ${result.messageId || 'N/A'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
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
                <h1 className="text-2xl font-bold text-white">Test Communications</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Test centralized Brevo and Vonage integrations
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium mb-1">Internal Testing Tool</h3>
                  <p className="text-sm text-gray-400">
                    This is an internal tool for super admins to verify that LoyaltyHub's Brevo and Vonage
                    integrations are working correctly. Use this to test SMTP and SMS delivery without
                    affecting tenant accounts or usage limits.
                  </p>
                </div>
              </div>
            </div>

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

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex border-b border-zinc-800">
                <button
                  onClick={() => setActiveTab('email')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                    activeTab === 'email'
                      ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                      : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  Email Testing
                </button>
                <button
                  onClick={() => setActiveTab('sms')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                    activeTab === 'sms'
                      ? 'bg-red-500/10 text-red-400 border-b-2 border-red-500'
                      : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  SMS Testing
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'email' ? (
                  <form onSubmit={handleSendEmail} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Recipient Email *
                        </label>
                        <input
                          type="email"
                          value={emailForm.recipientEmail}
                          onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                          placeholder="admin@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Recipient Name
                        </label>
                        <input
                          type="text"
                          value={emailForm.recipientName}
                          onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
                          className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                          placeholder="Admin User"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Message Body *
                      </label>
                      <textarea
                        value={emailForm.body}
                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        {sending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending Email...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Test Email
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Platform Configuration</h3>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>Provider: <span className="text-orange-400">Brevo (LoyaltyHub Account)</span></li>
                        <li>From: Platform-configured email address</li>
                        <li>Note: This test does not count against tenant limits</li>
                      </ul>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendSms} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Recipient Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={smsForm.recipientPhone}
                        onChange={(e) => setSmsForm({ ...smsForm, recipientPhone: e.target.value })}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                        placeholder="+1234567890"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        Include country code (e.g., +1 for US)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Message *
                      </label>
                      <textarea
                        value={smsForm.message}
                        onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition resize-none"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        Keep message concise for SMS delivery
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        {sending ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending SMS...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Test SMS
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Platform Configuration</h3>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>Provider: <span className="text-orange-400">Vonage (LoyaltyHub Account)</span></li>
                        <li>From: Platform-configured phone number</li>
                        <li>Note: This test does not count against tenant limits</li>
                      </ul>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

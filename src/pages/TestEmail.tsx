import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { Mail, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TestEmail() {
  const { business } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    recipientEmail: 'karl@medias.no',
    recipientName: 'Karl',
    subject: 'Test Email from Brevo Integration',
    body: 'This is a test email sent through the Brevo integration. If you receive this, the integration is working correctly!',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', business.id)
        .limit(1)
        .maybeSingle();

      if (!customers) {
        throw new Error('No customers found. Please add a customer first.');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-email`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business.id,
          customerId: customers.id,
          subject: formData.subject,
          body: formData.body,
          recipientEmail: formData.recipientEmail,
          recipientName: formData.recipientName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 ml-64">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Test Email Integration</h1>
            <p className="text-gray-400">Send a test email to verify your Brevo integration</p>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Send Test Email</h2>
                <p className="text-sm text-gray-400">Verify your email configuration</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">Email sent successfully!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Test Email
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-2">Configuration Required</h3>
              <p className="text-xs text-gray-400 mb-2">
                Make sure the following environment variables are set in your Supabase project:
              </p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li><code className="text-orange-400">BREVO_API_KEY</code> - Your Brevo API key</li>
                <li><code className="text-orange-400">EMAIL_FROM</code> - Sender email address</li>
                <li><code className="text-orange-400">EMAIL_FROM_NAME</code> - Sender name</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

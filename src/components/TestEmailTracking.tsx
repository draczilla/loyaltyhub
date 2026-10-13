import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Info,
  Eye,
  Calendar
} from 'lucide-react';

interface TestEmail {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  opened_at: string | null;
  open_count: number;
  error_message: string | null;
  is_test_email?: boolean;
  provider_message_id?: string | null;
  metadata: {
    recipient_email?: string;
    recipient_name?: string;
  };
}

interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  send_count: number;
  reset_at: string;
  limit: number;
}

export default function TestEmailTracking() {
  const { business } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testEmails, setTestEmails] = useState<TestEmail[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (business) {
      loadTestEmails();
      loadRateLimitInfo();

      const interval = setInterval(() => {
        const hasPending = testEmails.some(email => email.status === 'sent' && !email.opened_at);
        if (hasPending) {
          loadTestEmails();
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [business]);

  const loadRateLimitInfo = async () => {
    if (!business) return;

    try {
      const { data, error } = await supabase
        .rpc('check_test_email_rate_limit', { p_business_id: business.id });

      if (!error && data) {
        setRateLimitInfo(data);
      }
    } catch (err) {
      console.error('Error loading rate limit info:', err);
    }
  };

  const loadTestEmails = async () => {
    if (!business) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('id, subject, status, created_at, opened_at, open_count, error_message, metadata, provider_message_id')
        .eq('business_id', business.id)
        .eq('type', 'email')
        .eq('is_test_email', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setTestEmails(data as TestEmail[]);
      }
    } catch (err) {
      console.error('Error loading test emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTestEmails(), loadRateLimitInfo()]);
    setRefreshing(false);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setError('');
    setSuccess('');
    setSending(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        throw new Error('Please enter a valid email address');
      }

      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const testSubject = `Test Email from Your Business - LoyaltyHub Tracking Verification`;
      const testBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <h1 style="color: white; margin: 0; font-size: 24px; text-align: center;">Email Tracking Test</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; text-align: center; font-size: 14px;">LoyaltyHub Email Verification</p>
    </div>

    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #1e40af; font-weight: 600;">
        <strong>This is a test email</strong>
      </p>
      <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 14px;">
        Simply viewing this email tests the tracking pixel functionality.
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">What This Tests</h2>
    <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
      <li>Email delivery from LoyaltyHub's Brevo account</li>
      <li>Email open tracking via embedded pixel</li>
      <li>Real-time tracking status updates</li>
      <li>Multiple open detection</li>
    </ul>

    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin: 25px 0;">
      <h3 style="color: #1f2937; font-size: 16px; margin-top: 0;">Next Steps</h3>
      <ol style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin-bottom: 0;">
        <li>Check your Settings page for tracking results</li>
        <li>Status should update to "Tracked" within seconds</li>
        <li>View detailed open information including IP and timestamp</li>
        <li>Try opening this email multiple times to test count tracking</li>
      </ol>
    </div>

    <p style="color: #6b7280; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      This test email was sent from <strong>LoyaltyHub</strong><br>
      Powered by LoyaltyHub Email Tracking
    </p>
  </div>
</body>
</html>
      `.trim();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            businessId: business.id,
            subject: testSubject,
            body: testBody,
            recipientEmail: recipientEmail,
            recipientName: recipientName || 'Test User',
            isTestEmail: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to send test email');
      }

      setSuccess('Test email sent successfully! Check your inbox and watch for status updates.');
      setRecipientEmail('');
      setRecipientName('');
      await Promise.all([loadTestEmails(), loadRateLimitInfo()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (email: TestEmail) => {
    if (email.status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    }

    if (email.opened_at) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
          <CheckCircle className="w-3.5 h-3.5" />
          Tracked
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
        <Clock className="w-3.5 h-3.5" />
        Pending
      </span>
    );
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getResetCountdown = () => {
    if (!rateLimitInfo?.reset_at) return '';

    const resetTime = new Date(rateLimitInfo.reset_at);
    const now = new Date();
    const diffMs = resetTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Resets in less than a minute';
    if (diffMins < 60) return `Resets in ${diffMins} minutes`;
    return `Resets at ${resetTime.toLocaleTimeString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="mb-2">
              Test emails use Brevo's native tracking API to verify email delivery and tracking functionality.
              Tracking data updates via webhooks and periodic polling (every 15 minutes).
            </p>
            <p className="text-gray-400">
              Limited to 3 test emails per hour to prevent abuse.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {rateLimitInfo && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Test Email Usage</p>
              <p className="text-sm text-gray-400 mt-1">
                {rateLimitInfo.remaining} of {rateLimitInfo.limit} tests remaining this hour
              </p>
              <p className="text-xs text-gray-500 mt-1">{getResetCountdown()}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {rateLimitInfo.remaining}/{rateLimitInfo.limit}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSendTest} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Email Address *
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            placeholder="test@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Name (Optional)
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            placeholder="Test User"
          />
        </div>

        <button
          type="submit"
          disabled={sending || rateLimitInfo?.allowed === false}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending Test...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Test Email
            </>
          )}
        </button>
      </form>

      <div className="border-t border-zinc-800 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Test Emails</h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-gray-300 rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : testEmails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No test emails yet</h3>
            <p className="text-gray-500">
              Send your first test email to verify tracking functionality
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {testEmails.map((email) => (
              <div
                key={email.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white font-medium truncate">
                        {email.metadata?.recipient_email || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatRelativeTime(email.created_at)}</span>
                    </div>
                  </div>
                  {getStatusBadge(email)}
                </div>

                {email.opened_at && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded p-3 mb-2">
                    <div className="flex items-center gap-2 text-sm text-green-400 mb-1">
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">
                        Opened {email.open_count} {email.open_count === 1 ? 'time' : 'times'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      First opened: {formatRelativeTime(email.opened_at)}
                    </p>
                  </div>
                )}

                {email.error_message && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded p-3 mb-2">
                    <p className="text-xs text-red-400">
                      <span className="font-medium">Error:</span> {email.error_message}
                    </p>
                  </div>
                )}

                {email.provider_message_id && (
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-zinc-700">
                    <span className="font-medium">Brevo Message ID:</span>
                    <code className="ml-2 text-gray-400 break-all">
                      {email.provider_message_id}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

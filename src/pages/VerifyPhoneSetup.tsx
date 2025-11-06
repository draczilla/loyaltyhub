import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyPhoneSetup() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || !business) {
      navigate('/login');
      return;
    }

    if (!business.email_verified) {
      navigate('/verify-email');
      return;
    }

    if (business.phone_verified) {
      navigate('/dashboard');
      return;
    }
  }, [user, business, navigate]);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!phone || phone.length < 10) {
        throw new Error('Please enter a valid phone number');
      }

      if (!business) {
        throw new Error('No business account found');
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phone-verification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: business.id,
            phone: formattedPhone,
            companyName: business.company_name,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send verification SMS');
      }

      setSuccess(true);
      setError('');
    } catch (err) {
      console.error('Phone verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send verification SMS');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    await handleSubmit(new Event('submit') as any);
  };

  if (!business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verify Your Phone</h1>
          <p className="text-gray-400">One more step to secure your account</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">SMS Sent!</h2>
              <p className="text-gray-400 mb-6">
                We've sent a verification link to your phone. Click the link in the SMS to complete
                verification.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-blue-400 text-sm">
                  The verification link will expire in 15 minutes. Check your phone and click the
                  link to continue.
                </p>
              </div>
              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Resend SMS'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-blue-400 text-sm">
                  For security, we need to verify your phone number. You'll receive an SMS with a
                  verification link.
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <div className="w-20 px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white text-center">
                    +1
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="5551234567"
                    required
                    className="flex-1 px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter your 10-digit phone number (e.g., 5551234567)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending SMS...
                  </>
                ) : (
                  'Send Verification SMS'
                )}
              </button>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Standard SMS rates may apply. By continuing, you agree to receive an SMS verification
                message.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

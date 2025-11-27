import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Phone, Lock, ArrowRight } from 'lucide-react';

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: cleanPhone, pin })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('customer_session', JSON.stringify(result.session));
      navigate('/customer/dashboard');
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    }
    return value;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Customer Portal</h1>
          <p className="text-gray-400">Access your rewards and loyalty benefits</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  placeholder="(555) 123-4567"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter your PIN"
                  required
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter your 4-6 digit PIN</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone || !pin}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-gray-500">
              Don't have a PIN?{' '}
              <button className="text-orange-400 hover:text-orange-300 transition">
                Contact your business
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

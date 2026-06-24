import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserPlus, Check, Gift, CheckCircle, XCircle } from 'lucide-react';

interface SubscriptionTier {
  id: string;
  name: string;
  max_customers: number;
  max_programs: number;
  max_sms_monthly: number;
  price_monthly: number;
  stripe_price_id: string | null;
  features: Record<string, boolean>;
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState('');
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadTiers();

    // Check for referral code in URL
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      validateReferralCode(refCode);
    }
  }, []);

  useEffect(() => {
    if (location.state?.selectedTier && tiers.length > 0) {
      setSelectedTier(location.state.selectedTier);
    }
  }, [location.state, tiers]);

  const loadTiers = async () => {
    const { data } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (data) {
      setTiers(data);
      const freeTier = data.find(t => t.name === 'Free');
      if (freeTier) {
        setSelectedTier(freeTier.id);
      }
    }
  };

  const validateReferralCode = async (code: string) => {
    if (!code || code.trim() === '') {
      setReferralValid(null);
      setReferrerName('');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('validate_referral_code', {
        p_referral_code: code.toUpperCase()
      });

      if (error) {
        console.error('Error validating referral code:', error);
        setReferralValid(false);
        setReferrerName('');
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setReferralValid(result.valid);
        setReferrerName(result.business_name || '');
      } else {
        setReferralValid(false);
        setReferrerName('');
      }
    } catch (err) {
      console.error('Error validating referral code:', err);
      setReferralValid(false);
      setReferrerName('');
    }
  };

  const handleReferralCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setReferralCode(upperValue);

    if (upperValue.length >= 8) {
      validateReferralCode(upperValue);
    } else if (upperValue.length === 0) {
      setReferralValid(null);
      setReferrerName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedTier) {
      setError('Please select a subscription tier');
      setLoading(false);
      return;
    }

    // If referral code provided, validate it first
    if (referralCode && !referralValid) {
      setError('Invalid referral code. Please check and try again.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, companyName, selectedTier);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If referral code is valid, create referral record
    if (referralCode && referralValid) {
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (business) {
          const { data: referrerData } = await supabase.rpc('validate_referral_code', {
            p_referral_code: referralCode
          });

          if (referrerData && referrerData.length > 0) {
            const referrerBusinessId = referrerData[0].referrer_business_id;

            await supabase.from('referrals').insert({
              referral_code: referralCode,
              referrer_business_id: referrerBusinessId,
              referred_business_id: business.id,
              referred_email: email,
              referral_status: 'signed_up',
              month_of_referral: new Date().toISOString().substring(0, 7)
            });
          }
        }
      } catch (err) {
        console.error('Error creating referral record:', err);
      }
    }

    navigate('/dashboard');
  };

  const handleGoogleSignUp = async () => {
    setError('');
    const { error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Start Your Free Trial</h1>
          <p className="text-gray-400">Create your loyalty platform account</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="Your Business"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4 text-orange-400" />
                Referral Code (Optional)
              </label>
              <div className="relative">
                <input
                  id="referralCode"
                  type="text"
                  value={referralCode}
                  onChange={(e) => handleReferralCodeChange(e.target.value)}
                  maxLength={8}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition uppercase"
                  placeholder="ABCD1234"
                />
                {referralCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {referralValid === true && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {referralValid === false && (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                )}
              </div>
              {referralValid && referrerName && (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Joining with <strong>{referrerName}</strong>'s referral! You both earn rewards.
                  </p>
                </div>
              )}
              {referralValid === false && referralCode && (
                <p className="text-xs text-red-400 mt-1">Invalid referral code</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Choose Your Plan
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tiers.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-6 rounded-lg border-2 text-left transition ${
                      selectedTier === tier.id
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-zinc-700 bg-black hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                      {selectedTier === tier.id && (
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-white mb-4">
                      ${tier.price_monthly}
                      <span className="text-sm text-gray-400 font-normal">/month</span>
                    </p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li>
                        {tier.max_customers === -1 ? 'Unlimited' : tier.max_customers} customers
                      </li>
                      <li>
                        {tier.max_programs === -1 ? 'Unlimited' : tier.max_programs} programs
                      </li>
                      <li>{tier.max_sms_monthly} SMS/month</li>
                      {tier.features.mailchimp && <li className="text-orange-400">MailChimp integration</li>}
                      {tier.features.white_label && <li className="text-orange-400">White-label</li>}
                    </ul>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-orange-400 hover:text-orange-300 font-medium transition"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

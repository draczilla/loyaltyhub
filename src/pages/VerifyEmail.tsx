import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [nextStep, setNextStep] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please click the verification link in your email.');
      setNextStep('login');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const { data, error } = await supabase
        .rpc('verify_token', {
          p_token: token,
          p_verification_type: 'email',
        })
        .single();

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          setStatus('success');
          setMessage((data as any).message || 'Email verified successfully!');
          setNextStep((data as any).next_step || '');

          setTimeout(() => {
            // Redirect to dashboard after successful email verification
            // Users can verify phone later from Company Profile if needed
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage((data as any).message || 'Verification failed');
          setNextStep((data as any).next_step || 'login');
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
    }
  };

  const handleResendEmail = async () => {
    setStatus('verifying');
    setMessage('Sending new verification email...');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('company_name, email, tier_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!business) {
        throw new Error('Business not found');
      }

      const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('name')
        .eq('id', business.tier_id)
        .maybeSingle();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-verification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: user.id,
            email: business.email,
            companyName: business.company_name,
            tierName: tier?.name || 'Free',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }

      setStatus('success');
      setMessage('A new verification email has been sent. Please check your inbox.');
    } catch (err) {
      console.error('Resend error:', err);
      setStatus('error');
      setMessage('Failed to resend verification email. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-center">
            {status === 'verifying' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4">
                  <Loader className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Email</h1>
                <p className="text-gray-400">Please wait while we verify your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
                <p className="text-gray-400 mb-4">{message}</p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
                  <p className="text-blue-400 text-sm">
                    Redirecting to your profile...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Verification Issue</h1>
                <p className="text-gray-400 mb-6">{message}</p>

                {nextStep === 'login' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                    <p className="text-blue-400 text-sm">
                      Please check your email inbox (and spam folder) for the verification link we sent you. Click the link in the email to verify your account.
                    </p>
                  </div>
                )}

                {nextStep === 'request_new' && (
                  <button
                    onClick={handleResendEmail}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition"
                  >
                    <Mail className="w-5 h-5" />
                    Resend Verification Email
                  </button>
                )}

                <button
                  onClick={() => navigate('/login')}
                  className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition"
                >
                  {nextStep === 'login' ? 'Continue to Login' : 'Back to Login'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Need help?{' '}
            <a href="mailto:support@yourdomain.com" className="text-orange-400 hover:text-orange-300">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

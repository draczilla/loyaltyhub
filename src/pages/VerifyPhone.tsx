import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function VerifyPhone() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [nextStep, setNextStep] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new SMS verification.');
      return;
    }

    verifyPhone();
  }, [token]);

  const verifyPhone = async () => {
    try {
      const { data, error } = await supabase
        .rpc('verify_token', {
          p_token: token,
          p_verification_type: 'phone',
        })
        .single();

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success) {
          setStatus('success');
          setMessage((data as any).message || 'Phone verified successfully!');
          setNextStep((data as any).next_step || '');

          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage((data as any).message || 'Verification failed');
          setNextStep((data as any).next_step || '');
        }
      } else {
        setStatus('error');
        setMessage('Invalid response from server');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage('An error occurred during verification. Please try again.');
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
                <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Phone</h1>
                <p className="text-gray-400">Please wait while we verify your phone number...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Phone Verified!</h1>
                <p className="text-gray-400 mb-4">{message}</p>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
                  <p className="text-green-400 text-sm font-medium">
                    Account setup complete! Redirecting to dashboard...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
                <p className="text-gray-400 mb-6">{message}</p>

                <button
                  onClick={() => navigate('/company-profile')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition"
                >
                  <Smartphone className="w-5 h-5" />
                  Go to Company Profile
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full mt-3 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition"
                >
                  Back to Dashboard
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

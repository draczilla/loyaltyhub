import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Mail, Smartphone, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface VerificationGuardProps {
  children: ReactNode;
  featureName?: string;
}

export default function VerificationGuard({ children, featureName = 'this feature' }: VerificationGuardProps) {
  const { business, loading, user } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleRetry = async () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  if (!business && user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-xl mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Business Data Not Loaded</h1>
              <p className="text-gray-400 mb-2">
                Unable to load your business information. This may happen if you just signed up.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Try refreshing the page. If the problem persists, please sign out and sign back in.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Refresh Page
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = business.email_verified && business.phone_verified;
  const hasCredits = (business.credits_remaining || 0) > 0;

  if (isVerified && hasCredits) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-xl mb-4">
              <Shield className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Verification Required</h1>
            <p className="text-gray-400">
              Complete account verification to access {featureName}
            </p>
          </div>

          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">What you need to do:</h2>
            <div className="space-y-3">
              {!business.email_verified && (
                <div className="flex items-start gap-3 p-3 bg-black rounded-lg border border-zinc-700">
                  <Mail className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Verify Your Email</p>
                    <p className="text-sm text-gray-400">
                      Confirm your email address to secure your account
                    </p>
                  </div>
                </div>
              )}
              {!business.phone_verified && (
                <div className="flex items-start gap-3 p-3 bg-black rounded-lg border border-zinc-700">
                  <Smartphone className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Verify Your Phone</p>
                    <p className="text-sm text-gray-400">
                      Confirm your phone number to unlock SMS features
                    </p>
                  </div>
                </div>
              )}
              {isVerified && !hasCredits && (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Credits Required</p>
                    <p className="text-sm text-gray-400">
                      {business.subscription_status === 'active'
                        ? 'Your credits will be available shortly. Please refresh the page or contact support if this persists.'
                        : 'Activate your subscription to receive credits for communication features.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium rounded-lg transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/company-profile')}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition"
            >
              Complete Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

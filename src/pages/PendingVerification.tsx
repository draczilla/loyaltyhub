import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PendingVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, business, loading, signOut } = useAuth();
  const email = location.state?.email || business?.email;
  const [timeRemaining, setTimeRemaining] = useState(60);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (loading) return;

    if (!email && !user) {
      navigate('/login');
      return;
    }

    if (business?.onboarding_status === 'completed') {
      navigate('/dashboard');
      return;
    }

    if (business?.onboarding_status === 'pending_phone') {
      navigate('/verify-phone-setup');
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, user, business, loading, navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-gray-400">We've sent a verification link to your inbox</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 rounded-full mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-white font-medium mb-2">Account Created Successfully!</p>
            <p className="text-gray-400 text-sm">
              We've sent a verification email to:
            </p>
            <p className="text-orange-400 font-medium mt-2">{email}</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <p className="text-blue-400 text-sm mb-2">
              <strong>Next Steps:</strong>
            </p>
            <ol className="text-blue-400 text-sm space-y-1 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>Verify your phone number</li>
              <li>Start using your loyalty platform</li>
            </ol>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 text-sm font-medium mb-1">
                  Email not received?
                </p>
                <p className="text-orange-400 text-xs">
                  Please wait a few minutes. If you still don't receive it, check your spam folder or contact support at admin@adaptiq.no
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>The verification link will expire in 24 hours</p>
            {timeRemaining > 0 && (
              <p className="mt-2">
                You can close this window. Redirecting to login in {timeRemaining}s...
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 text-center flex items-center justify-center gap-4">
          {user && (
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white text-sm font-medium transition"
            >
              Sign Out
            </button>
          )}
          <button
            onClick={() => navigate('/login')}
            className="text-orange-400 hover:text-orange-300 text-sm font-medium transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

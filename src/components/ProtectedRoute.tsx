import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, business, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow access to verification-related routes without blocking
  const verificationRoutes = [
    '/pending-verification',
    '/verify-email',
    '/verify-phone-setup',
    '/verify-phone',
    '/company-profile', // Company profile handles verification status internally
  ];

  const isVerificationRoute = verificationRoutes.some(route =>
    location.pathname.startsWith(route)
  );

  // Check onboarding status and redirect if needed (skip for verification routes)
  if (business && !isVerificationRoute) {
    // Only enforce email verification - phone verification is optional
    if (business.onboarding_status === 'pending_email' && !business.email_verified) {
      return <Navigate to="/pending-verification" replace />;
    }

    // Don't enforce phone verification - allow users to skip it
    // They can verify phone from Company Profile page at any time
  }

  return <>{children}</>;
}

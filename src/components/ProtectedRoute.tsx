import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, business, loading, isSuperAdmin } = useAuth();
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

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (business && business.onboarding_status !== 'completed') {
    if (business.onboarding_status === 'pending_email' && location.pathname !== '/pending-verification') {
      return <Navigate to="/pending-verification" replace state={{ email: business.email }} />;
    } else if (business.onboarding_status === 'pending_phone' && location.pathname !== '/verify-phone-setup') {
      return <Navigate to="/verify-phone-setup" replace />;
    }
  }

  return <>{children}</>;
}

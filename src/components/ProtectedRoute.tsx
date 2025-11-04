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
    const allowedPaths = ['/verify-email', '/verify-phone-setup', '/verify-phone'];

    if (!allowedPaths.includes(location.pathname)) {
      if (business.onboarding_status === 'pending_email') {
        return <Navigate to="/verify-email" replace />;
      } else if (business.onboarding_status === 'pending_phone') {
        return <Navigate to="/verify-phone-setup" replace />;
      }
    }
  }

  return <>{children}</>;
}

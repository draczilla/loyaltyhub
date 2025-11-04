import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function SuperAdminProtectedRoute({ children }: SuperAdminProtectedRouteProps) {
  const { user, loading, isSuperAdmin } = useAuth();

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

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute';

// Eager load critical pages for initial navigation
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

// Lazy load all other pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const QRCodes = lazy(() => import('./pages/QRCodes'));
const Programs = lazy(() => import('./pages/Programs'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Analytics = lazy(() => import('./pages/Analytics'));
const SmsTemplates = lazy(() => import('./pages/SmsTemplates'));
const EmailTemplates = lazy(() => import('./pages/EmailTemplates'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Settings = lazy(() => import('./pages/Settings'));
const Communications = lazy(() => import('./pages/Communications'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));

// Admin pages - separate chunk
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminTenants = lazy(() => import('./pages/SuperAdminTenants'));
const SuperAdminConfig = lazy(() => import('./pages/SuperAdminConfig'));
const SuperAdminCredits = lazy(() => import('./pages/SuperAdminCredits'));
const SuperAdminTestCommunications = lazy(() => import('./pages/SuperAdminTestCommunications'));
const SuperAdminCommunicationLogs = lazy(() => import('./pages/SuperAdminCommunicationLogs'));
const SuperAdminBrevoBalance = lazy(() => import('./pages/SuperAdminBrevoBalance'));

// Customer portal - separate chunk
const CustomerPortalLogin = lazy(() => import('./pages/CustomerPortalLogin'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));

// Verification pages
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyPhone = lazy(() => import('./pages/VerifyPhone'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
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

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={user ? (isSuperAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Landing />} />
        <Route path="/login" element={user ? (isSuperAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />) : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignUp />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr-codes"
          element={
            <ProtectedRoute>
              <QRCodes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/programs"
          element={
            <ProtectedRoute>
              <Programs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <Campaigns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sms-templates"
          element={
            <ProtectedRoute>
              <SmsTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/email-templates"
          element={
            <ProtectedRoute>
              <EmailTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications"
          element={
            <ProtectedRoute>
              <Communications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminDashboard />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/tenants"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminTenants />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/config"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminConfig />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/credits"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminCredits />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/test-communications"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminTestCommunications />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/communication-logs"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminCommunicationLogs />
            </SuperAdminProtectedRoute>
          }
        />
        <Route
          path="/admin/brevo-balance"
          element={
            <SuperAdminProtectedRoute>
              <SuperAdminBrevoBalance />
            </SuperAdminProtectedRoute>
          }
        />

        <Route path="/customer/login" element={<CustomerPortalLogin />} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />

        <Route
          path="/company-profile"
          element={
            <ProtectedRoute>
              <CompanyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company"
          element={<Navigate to="/company-profile" replace />}
        />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/pending-verification" element={<CompanyProfile />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-phone-setup" element={<CompanyProfile />} />
        <Route path="/verify-phone" element={<VerifyPhone />} />
      </Routes>
    </Suspense>
  );
}

export default App;

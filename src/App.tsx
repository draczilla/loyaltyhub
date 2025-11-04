import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import QRCodes from './pages/QRCodes';
import Programs from './pages/Programs';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import SmsTemplates from './pages/SmsTemplates';
import EmailTemplates from './pages/EmailTemplates';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import Communications from './pages/Communications';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminTenants from './pages/SuperAdminTenants';
import SuperAdminConfig from './pages/SuperAdminConfig';
import SuperAdminCredits from './pages/SuperAdminCredits';
import SuperAdminTestCommunications from './pages/SuperAdminTestCommunications';
import SuperAdminCommunicationLogs from './pages/SuperAdminCommunicationLogs';
import SuperAdminBrevoBalance from './pages/SuperAdminBrevoBalance';
import CustomerPortalLogin from './pages/CustomerPortalLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import CompanyProfile from './pages/CompanyProfile';
import AcceptInvitation from './pages/AcceptInvitation';
import VerifyEmail from './pages/VerifyEmail';
import VerifyPhoneSetup from './pages/VerifyPhoneSetup';
import VerifyPhone from './pages/VerifyPhone';

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
        path="/company"
        element={
          <ProtectedRoute>
            <CompanyProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-phone-setup" element={<VerifyPhoneSetup />} />
      <Route path="/verify-phone" element={<VerifyPhone />} />
    </Routes>
  );
}

export default App;

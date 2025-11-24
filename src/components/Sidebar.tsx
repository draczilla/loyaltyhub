import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Gift,
  QrCode,
  CreditCard,
  LogOut,
  X,
  Mail,
  BarChart3,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  History,
  Building2,
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isSuperAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Customers', path: '/customers' },
    { icon: Gift, label: 'Loyalty Programs', path: '/programs' },
    { icon: QrCode, label: 'QR Codes', path: '/qr-codes' },
    { icon: Mail, label: 'Campaigns', path: '/campaigns' },
    { icon: MessageSquare, label: 'SMS Templates', path: '/sms-templates' },
    { icon: FileText, label: 'Email Templates', path: '/email-templates' },
    { icon: History, label: 'Communications', path: '/communications' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Building2, label: 'Account Profile', path: '/company' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
    { icon: CreditCard, label: 'Subscription', path: '/subscription' },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-bold text-lg">LoyaltyHub</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}

              {isSuperAdmin && (
                <li>
                  <button
                    onClick={() => {
                      navigate('/admin/dashboard');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 mt-2"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span className="font-medium">Super Admin</span>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

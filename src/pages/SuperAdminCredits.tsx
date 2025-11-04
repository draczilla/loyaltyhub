import { useState } from 'react';
import { Menu } from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';

export default function SuperAdminCredits() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex">
      <SuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white transition"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-white">Credit Logs</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-white">Credit Logs - Coming Soon</p>
        </main>
      </div>
    </div>
  );
}

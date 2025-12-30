'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/Sidebar';
import { LogOut, User, Coins, Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !token) {
      router.push('/login');
    }
    
    // Block admin from accessing user dashboard
    if (_hasHydrated && user?.isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [token, _hasHydrated, user, router]);

  // Close sidebar on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#4f46e5' }}></div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Selamat datang, {user?.name || user?.email}!
                </h2>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Buat konten AI dengan mudah dan cepat
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Credits Display */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#eef2ff' }}>
                <Coins className="w-5 h-5" style={{ color: '#4f46e5' }} />
                <div>
                  <div className="text-xs text-gray-600">Credits</div>
                  <div className="text-lg font-bold" style={{ color: '#4f46e5' }}>
                    {user?.credits || 0}
                  </div>
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

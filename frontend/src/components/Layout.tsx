import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Monitor, X, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { token } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  const reloadDesktopMode = () => {
    setMobileMenuOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
        >
          <Menu size={18} />
          Menu
        </button>
        <button
          type="button"
          onClick={reloadDesktopMode}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 text-sm"
        >
          <Monitor size={16} />
          Desktop Site
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white p-2 text-slate-700 shadow"
          >
            <X size={18} />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <Sidebar
              mobile
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              onDesktopReload={reloadDesktopMode}
            />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto pt-20 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

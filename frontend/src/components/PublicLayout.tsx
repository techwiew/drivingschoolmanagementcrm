import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main>
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-slate-500 text-xs font-medium">
              &copy; {new Date().getFullYear()} DriveFlow Management System. Built for high-velocity operations.
            </div>
            <div className="flex gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  LogOut,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  const getNavItems = () => {
    switch(user?.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
          { name: 'Users', path: '/users', icon: <Users size={20} /> },
          { name: 'Schedule', path: '/schedule', icon: <Calendar size={20} /> },
          { name: 'Payments', path: '/payments', icon: <CreditCard size={20} /> },
          { name: 'Mock Tests', path: '/mock-tests', icon: <FileText size={20} /> },
        ];
      case 'STUDENT':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
          { name: 'My Schedule', path: '/my-schedule', icon: <Calendar size={20} /> },
          { name: 'Payments', path: '/my-payments', icon: <CreditCard size={20} /> },
          { name: 'Mock Tests', path: '/take-test', icon: <FileText size={20} /> },
        ];
      case 'TRAINER':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
          { name: 'Schedule', path: '/trainer-schedule', icon: <Calendar size={20} /> },
          { name: 'Students', path: '/my-students', icon: <Users size={20} /> },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col transition-all duration-300">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
          <span className="bg-emerald-500/20 p-2 rounded-lg">🚘</span> DriveFlow
        </h1>
        <div className="mt-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-400">Welcome,</p>
          <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-emerald-400 mt-1 bg-emerald-400/10 inline-block px-2 py-0.5 rounded-full">{user?.role}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {getNavItems().map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

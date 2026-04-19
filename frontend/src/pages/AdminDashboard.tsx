import { useAuthStore } from '../store/authStore';
import { Users, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const stats = [
    { title: 'Total Students', value: '1,245', change: '+12%', icon: <Users size={24} />, color: 'bg-blue-500' },
    { title: 'Active Trainers', value: '24', change: '+2', icon: <Users size={24} />, color: 'bg-emerald-500' },
    { title: 'Classes Today', value: '38', change: '0%', icon: <Calendar size={24} />, color: 'bg-purple-500' },
    { title: 'Revenue (MTD)', value: '$24,500', change: '+8%', icon: <TrendingUp size={24} />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.firstName}. Here's what's happening today.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          + New Enrollment
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
              <p className="text-xs font-medium text-emerald-600 mt-2">{stat.change} from last month</p>
            </div>
            <div className={`${stat.color} text-white p-4 rounded-xl shadow-lg opacity-90`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart/Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Revenue Overview</h2>
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50">
              <span className="text-slate-400 font-medium">Chart visualization placeholder</span>
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Upcoming Classes</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex flex-col items-center justify-center font-bold">
                    <span className="text-xs">Oct</span>
                    <span className="text-sm leading-none">24</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">Defensive Driving</h4>
                    <p className="text-xs text-slate-500">10:00 AM • Trainer: John Doe</p>
                  </div>
                </div>
              ))}
              <button className="w-full text-center text-sm font-medium text-emerald-600 mt-4 hover:underline">
                View full schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

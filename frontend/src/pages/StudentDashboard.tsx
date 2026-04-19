import { useAuthStore } from '../store/authStore';
import { Calendar, CreditCard, Award, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuthStore();

  const stats = [
    { title: 'Classes Attended', value: '12 / 15', icon: <Calendar size={24} />, color: 'bg-emerald-500' },
    { title: 'Balance Due', value: '$150.00', icon: <CreditCard size={24} />, color: 'bg-red-500' },
    { title: 'License Status', value: 'In Progress', icon: <Award size={24} />, color: 'bg-blue-500' },
    { title: 'Mock Test Score', value: '85%', icon: <Clock size={24} />, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.firstName}. Here is your training progress.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
          Book Next Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
            <div className={`${stat.color} text-white p-4 rounded-xl shadow-lg opacity-90`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Upcoming Classes</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm text-center min-w-[60px]">
                  <p className="text-xs text-slate-500 font-bold uppercase">Oct</p>
                  <p className="text-xl font-bold text-emerald-600">25</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Practical Driving</h4>
                  <p className="text-sm text-slate-500">10:00 AM - 11:30 AM</p>
                  <p className="text-xs text-emerald-600 mt-1">Trainer: Bob Jones</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-red-500 text-sm font-medium transition-colors">
                Reschedule
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm text-center min-w-[60px]">
                  <p className="text-xs text-slate-500 font-bold uppercase">Oct</p>
                  <p className="text-xl font-bold text-emerald-600">28</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Theory Mock Test</h4>
                  <p className="text-sm text-slate-500">2:00 PM - 3:00 PM</p>
                  <p className="text-xs text-emerald-600 mt-1">Online</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Training Progress</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-slate-700">Overall Course Completion</span>
                <span className="text-emerald-600">80%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-slate-700">Practical Hours (12/15)</span>
                <span className="text-blue-500">80%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-slate-700">Theory Classes (5/5)</span>
                <span className="text-purple-500">100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 mb-1">Ready for License Test!</h4>
            <p className="text-sm text-emerald-600">You have completed the required theory and practical hours to apply for your final driving test.</p>
            <button className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full transition-colors">
              Request Test Date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

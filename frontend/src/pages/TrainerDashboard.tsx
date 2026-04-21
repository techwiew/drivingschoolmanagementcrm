import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Calendar, Users, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function TrainerDashboard() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/schedules');
        setSchedules(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcoming = schedules.filter(s => s.status === 'SCHEDULED');
  const completed = schedules.filter(s => s.status === 'COMPLETED');
  const totalStudents = schedules.reduce((acc, s) => acc + (s.attendances?.length || 0), 0);

  const stats = [
    { title: 'Upcoming Classes', value: upcoming.length, icon: <Calendar size={24} />, color: 'bg-emerald-500' },
    { title: 'Completed Classes', value: completed.length, icon: <CheckCircle size={24} />, color: 'bg-blue-500' },
    { title: 'Total Students Taught', value: totalStudents, icon: <Users size={24} />, color: 'bg-purple-500' },
    { title: 'Total Sessions', value: schedules.length, icon: <Calendar size={24} />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trainer Dashboard</h1>
        <p className="text-slate-500">Welcome back, {user?.firstName}. Here's your schedule overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
            </div>
            <div className={`${stat.color} text-white p-4 rounded-xl shadow-lg opacity-90`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Classes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-emerald-500" /> Upcoming Classes
          </h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
              <p>No upcoming classes scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors">
                  <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg min-w-[48px] text-center">
                    <p className="text-xs font-bold uppercase">{format(new Date(s.startTime), 'MMM')}</p>
                    <p className="text-xl font-bold leading-none">{format(new Date(s.startTime), 'd')}</p>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{s.course?.title}</h4>
                    <p className="text-sm text-slate-500">
                      {format(new Date(s.startTime), 'h:mm a')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{s.attendances?.length || 0} students enrolled</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-md">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-blue-500" /> Completed Classes
          </h2>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : completed.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
              <p>No completed classes yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className="bg-blue-100 text-blue-700 p-2 rounded-lg min-w-[48px] text-center">
                    <p className="text-xs font-bold uppercase">{format(new Date(s.startTime), 'MMM')}</p>
                    <p className="text-xl font-bold leading-none">{format(new Date(s.startTime), 'd')}</p>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{s.course?.title}</h4>
                    <p className="text-sm text-slate-500">
                      {format(new Date(s.startTime), 'h:mm a')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {s.attendances?.filter((a: any) => a.status === 'PRESENT').length || 0} / {s.attendances?.length || 0} present
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-md">
                    DONE
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


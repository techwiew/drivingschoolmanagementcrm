import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Calendar, CreditCard, Award, ClipboardList, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [schRes, payRes, testRes] = await Promise.all([
          api.get('/schedules'),
          api.get('/payments'),
          api.get('/mock-tests')
        ]);
        setSchedules(schRes.data);
        setPayments(payRes.data);
        setTests(testRes.data);

        // Flatten all attendances from all schedules
        const allAttendance: any[] = [];
        for (const s of schRes.data) {
          for (const a of s.attendances || []) {
            allAttendance.push({ ...a, schedule: s });
          }
        }
        setAttendance(allAttendance);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const upcoming = schedules.filter(s => s.status === 'SCHEDULED');
  const completedClasses = schedules.filter(s => s.status === 'COMPLETED').length;
  const totalClasses = schedules.length;
  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((a, c) => a + c.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDING').reduce((a, c) => a + c.amount, 0);

  // Best test score
  const allResults = tests.flatMap(t => t.results || []);
  const bestScore = allResults.length > 0 ? Math.max(...allResults.map((r: any) => r.score)) : null;

  const stats = [
    {
      title: 'Classes Attended',
      value: loading ? '...' : `${completedClasses} / ${totalClasses}`,
      icon: <Calendar size={24} />,
      color: 'bg-emerald-500'
    },
    {
      title: 'Balance Due',
      value: loading ? '...' : `$${totalPending.toFixed(2)}`,
      icon: <CreditCard size={24} />,
      color: totalPending > 0 ? 'bg-red-500' : 'bg-emerald-500'
    },
    {
      title: 'Attendance Records',
      value: loading ? '...' : attendance.length,
      icon: <ClipboardList size={24} />,
      color: 'bg-blue-500'
    },
    {
      title: 'Best Test Score',
      value: loading ? '...' : (bestScore !== null ? `${bestScore}%` : 'N/A'),
      icon: <Award size={24} />,
      color: 'bg-purple-500'
    },
  ];

  const progressPct = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.firstName}. Here is your training progress.</p>
        </div>
        <button
          onClick={() => navigate('/mock-tests')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          Take a Mock Test
        </button>
      </div>

      {/* Stats */}
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
        {/* Upcoming Classes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-emerald-500" /> Upcoming Classes
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={36} className="mx-auto mb-2 opacity-30" />
              <p>No upcoming classes scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-center min-w-[52px]">
                      <p className="text-xs text-slate-500 font-bold uppercase">{format(new Date(s.startTime), 'MMM')}</p>
                      <p className="text-xl font-bold text-emerald-600">{format(new Date(s.startTime), 'd')}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{s.course?.title}</h4>
                      <p className="text-xs text-slate-500">
                        {format(new Date(s.startTime), 'h:mm a')}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Trainer: {s.trainer?.user?.firstName} {s.trainer?.user?.lastName}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-1 rounded-full">
                    SCHEDULED
                  </span>
                </div>
              ))}
              {upcoming.length > 4 && (
                <button onClick={() => navigate('/schedule')} className="w-full text-center text-sm text-emerald-600 font-medium hover:underline py-2">
                  View all {upcoming.length} classes →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Training Progress</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-700">Overall Course Completion</span>
                  <span className="text-emerald-600">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-1">{completedClasses} of {totalClasses} classes completed</p>
              </div>

              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-slate-700">Payments Cleared</span>
                  <span className="text-blue-500">
                    {totalPaid + totalPending > 0
                      ? Math.round((totalPaid / (totalPaid + totalPending)) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all"
                    style={{
                      width: totalPaid + totalPending > 0
                        ? `${Math.round((totalPaid / (totalPaid + totalPending)) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">${totalPaid.toFixed(2)} paid · ${totalPending.toFixed(2)} due</p>
              </div>

              {/* Recent payments */}
              {payments.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent Payments</h3>
                  <div className="space-y-2">
                    {payments.slice(0, 3).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>
                        <span className="font-semibold text-slate-800">${p.amount.toFixed(2)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('/payments')} className="w-full text-center text-sm text-emerald-600 font-medium hover:underline mt-3">
                    View all payments →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


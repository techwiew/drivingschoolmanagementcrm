import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Users, Calendar, TrendingUp, CreditCard, Loader2, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const isSameMonth = (value: string, date: Date) => {
  const parsed = new Date(value);
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth();
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [uRes, sRes, pRes] = await Promise.all([
          api.get('/users'),
          api.get('/schedules'),
          api.get('/payments')
        ]);
        setAllUsers(uRes.data);
        setSchedules(sRes.data);
        setPayments(pRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const students  = allUsers.filter(u => u.role === 'STUDENT');
  const trainers  = allUsers.filter(u => u.role === 'TRAINER');
  const upcoming  = schedules.filter(s => s.status === 'SCHEDULED');
  const revenue   = payments.filter(p => p.status === 'PAID').reduce((a, c) => a + c.amount, 0);
  const pending   = payments.filter(p => p.status === 'PENDING').reduce((a, c) => a + c.amount, 0);
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthStudents = students.filter(s => isSameMonth(s.createdAt, now)).length;
  const lastMonthStudents = students.filter(s => isSameMonth(s.createdAt, lastMonth)).length;
  const collectedThisMonth = payments
    .filter(p => p.status === 'PAID' && isSameMonth(p.createdAt, now))
    .reduce((a, c) => a + c.amount, 0);
  const outstandingBalance = students.reduce((acc, student) => acc + Math.max(student.studentProfile?.balanceDue || 0, 0), 0);
  const paidPayments = payments.filter(p => p.status === 'PAID');
  const averagePayment = paidPayments.length ? revenue / paidPayments.length : 0;
  const monthClasses = schedules.filter(s => isSameMonth(s.startTime, now));
  const completedClasses = schedules.filter(s => s.status === 'COMPLETED').length;

  const stats = [
    { title: 'Total Students', value: loading ? '...' : students.length, sub: `${allUsers.length} total users`, icon: <Users size={22} />, color: 'bg-blue-500' },
    { title: 'Active Trainers', value: loading ? '...' : trainers.length, sub: 'registered trainers', icon: <Users size={22} />, color: 'bg-emerald-500' },
    { title: 'Upcoming Classes', value: loading ? '...' : upcoming.length, sub: `${schedules.length} total scheduled`, icon: <Calendar size={22} />, color: 'bg-purple-500' },
    { title: 'Revenue Collected', value: loading ? '...' : `$${revenue.toFixed(0)}`, sub: `$${pending.toFixed(0)} pending`, icon: <TrendingUp size={22} />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.firstName}. Here's what's happening today.</p>
        </div>
        <button
          onClick={() => navigate('/users')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Users size={16} /> Manage Users
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
            </div>
            <div className={`${stat.color} text-white p-4 rounded-xl shadow-lg opacity-90`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Business Analytics</h2>
            <p className="text-sm text-slate-500">{format(now, 'MMMM yyyy')} performance snapshot</p>
          </div>
          <button onClick={() => navigate('/payments')} className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
            Payments <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Students This Month', value: currentMonthStudents, detail: `${lastMonthStudents} last month` },
            { label: 'Collected This Month', value: `$${collectedThisMonth.toFixed(0)}`, detail: `$${revenue.toFixed(0)} all time` },
            { label: 'Outstanding Balance', value: `$${outstandingBalance.toFixed(0)}`, detail: `$${pending.toFixed(0)} pending records` },
            { label: 'Average Payment', value: `$${averagePayment.toFixed(0)}`, detail: `${paidPayments.length} collected payments` },
            { label: 'Classes This Month', value: monthClasses.length, detail: `${completedClasses} completed total` }
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{loading ? '...' : item.value}</p>
              <p className="text-xs text-slate-400 mt-1">{loading ? 'Loading' : item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Classes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-emerald-500" /> Upcoming Classes
            </h2>
            <button onClick={() => navigate('/schedule')} className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-emerald-500" /></div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={36} className="mx-auto mb-2 opacity-30" />
              <p>No upcoming classes. <button onClick={() => navigate('/schedule')} className="text-emerald-600 underline">Schedule one</button></p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0">
                    <span className="text-xs uppercase">{format(new Date(s.startTime), 'MMM')}</span>
                    <span className="text-xl leading-tight">{format(new Date(s.startTime), 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{s.course?.title}</h4>
                    <p className="text-xs text-slate-500">
                      {format(new Date(s.startTime), 'h:mm a')}
                    </p>
                    <p className="text-xs text-emerald-600">Trainer: {s.trainer?.user?.firstName} {s.trainer?.user?.lastName}</p>
                  </div>
                  <span className="text-xs text-slate-500">{s.attendances?.length || 0} enrolled</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          {/* Recent Payments */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-500" /> Payments
              </h2>
              <button onClick={() => navigate('/payments')} className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                View <ChevronRight size={14} />
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-emerald-500" size={20} /></div>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate max-w-[100px]">
                      {p.student?.user?.firstName} {p.student?.user?.lastName}
                    </span>
                    <span className="font-semibold text-slate-800">${p.amount.toFixed(0)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>{p.status}</span>
                  </div>
                ))}
                {payments.length === 0 && <p className="text-slate-400 text-sm text-center py-2">No payments yet.</p>}
              </div>
            )}
          </div>

          {/* User summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-emerald-500" /> Users
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Students', count: students.length, color: 'bg-blue-400' },
                { label: 'Trainers', count: trainers.length, color: 'bg-emerald-400' },
                { label: 'Admins', count: allUsers.filter(u => u.role === 'ADMIN').length, color: 'bg-purple-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${row.color}`} />
                  <span className="text-sm text-slate-600 flex-1">{row.label}</span>
                  <span className="text-sm font-bold text-slate-800">{loading ? '...' : row.count}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/users')} className="w-full mt-4 text-center text-sm text-emerald-600 hover:underline">
              Manage all users →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


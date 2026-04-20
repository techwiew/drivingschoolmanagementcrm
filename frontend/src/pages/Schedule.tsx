import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Calendar as CalendarIcon, Clock, Users, Plus, X, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Schedule() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ trainerId: '', date: '', startTime: '', endTime: '' });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const isAdmin = user?.role === 'ADMIN';

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await api.get('/users');
      setTrainers(res.data.filter((u: any) => u.role === 'TRAINER'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    if (isAdmin) fetchTrainers();
  }, []);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await api.post('/schedules', {
        trainerId: formData.trainerId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      });

      setIsModalOpen(false);
      setFormData({ trainerId: '', date: '', startTime: '', endTime: '' });
      fetchSchedules();
    } catch (err: any) {
      alert('Failed to add schedule: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const filtered = filterStatus === 'ALL'
    ? schedules
    : schedules.filter(s => s.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Class Schedule</h1>
          <p className="text-slate-500">
            {isAdmin ? 'Manage all driving sessions.' : 'View your upcoming driving sessions.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Schedule Class
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {s === 'ALL' ? `All (${schedules.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${schedules.filter(sc => sc.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center flex justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
              <div className={`p-4 border-b flex justify-between items-start ${
                schedule.status === 'COMPLETED' ? 'bg-blue-50 border-blue-100' :
                schedule.status === 'CANCELLED' ? 'bg-red-50 border-red-100' :
                'bg-emerald-500/10 border-emerald-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    {schedule.status === 'COMPLETED'
                      ? <CheckCircle size={22} className="text-blue-500" />
                      : <CalendarIcon size={22} className="text-emerald-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">
                      {schedule.course?.title || 'Driving Session'}
                    </h3>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase mt-1 ${statusColors[schedule.status] || 'bg-slate-100 text-slate-600'}`}>
                      {schedule.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{format(new Date(schedule.startTime), 'MMM d, yyyy')}</p>
                    <p className="text-slate-500 text-xs">{format(new Date(schedule.startTime), 'h:mm a')} – {format(new Date(schedule.endTime), 'h:mm a')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <Users size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {schedule.trainer?.user?.firstName} {schedule.trainer?.user?.lastName}
                    </p>
                    <p className="text-slate-400 text-xs">{schedule.attendances?.length || 0} students marked</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <CalendarIcon size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No classes found for this filter.</p>
              {isAdmin && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-emerald-600 text-sm font-medium hover:underline"
                >
                  + Schedule the first class
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal (Admin only) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Schedule New Class</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Trainer</label>
                <select
                  required value={formData.trainerId}
                  onChange={e => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a Trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
                {trainers.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No trainers found. Add a trainer in Users first.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date" required value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time" required value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time" required value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving || trainers.length === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex justify-center items-center"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

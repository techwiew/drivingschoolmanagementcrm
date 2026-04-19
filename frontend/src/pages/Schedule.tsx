import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { Calendar as CalendarIcon, Clock, Users, Plus, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Schedule() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ trainerId: '', date: '', startTime: '', endTime: '' });

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
    fetchTrainers();
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
      fetchSchedules();
    } catch (err) {
      alert('Failed to add schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Class Schedule</h1>
          <p className="text-slate-500">Manage all driving sessions and track attendance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Schedule Class
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center flex justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/10 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm">
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{schedule.course.title}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-700 mt-1">
                      {schedule.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={18} className="text-slate-400" />
                  <div className="text-sm">
                    <p className="font-medium">{format(new Date(schedule.startTime), 'MMM d, yyyy')}</p>
                    <p className="text-slate-500">{format(new Date(schedule.startTime), 'h:mm a')} - {format(new Date(schedule.endTime), 'h:mm a')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-slate-600">
                  <Users size={18} className="text-slate-400" />
                  <div className="text-sm">
                    <p className="font-medium">Trainer: {schedule.trainer.user.firstName} {schedule.trainer.user.lastName}</p>
                    <p className="text-slate-500">{schedule.attendances.length} Students enrolled</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {schedules.length === 0 && (
            <div className="col-span-3 text-center p-12 bg-white rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-400">No classes scheduled yet. Create one to get started!</p>
            </div>
          )}
        </div>
      )}

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
                <select required value={formData.trainerId} onChange={e => setFormData({...formData, trainerId: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">Select a Trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" /> : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

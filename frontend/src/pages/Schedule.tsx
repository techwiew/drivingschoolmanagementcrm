import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';

type ScheduleFormState = {
  trainerId: string;
  studentId: string;
  date: string;
  startTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes: string;
};

const defaultForm: ScheduleFormState = {
  trainerId: '',
  studentId: '',
  date: '',
  startTime: '',
  status: 'SCHEDULED',
  notes: ''
};

type Notice = { type: 'success' | 'error'; text: string } | null;

const getErrorMessage = (err: any, fallback: string) =>
  err.response?.data?.error || err.response?.data?.details || err.message || fallback;

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

export default function Schedule() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [schedules, setSchedules] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ScheduleFormState>(defaultForm);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedScheduleForDelete, setSelectedScheduleForDelete] = useState<any | null>(null);

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

  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users');
      const allUsers = res.data || [];
      setTrainers(allUsers.filter((u: any) => u.role === 'TRAINER'));
      setStudents(allUsers.filter((u: any) => u.role === 'STUDENT'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingScheduleId(null);
    setFormData(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (schedule: any) => {
    const date = new Date(schedule.startTime);
    const trainerUserId = schedule.trainer?.user?.id || '';
    const studentUserId = schedule.student?.user?.id || '';
    setEditingScheduleId(schedule.id);
    setFormData({
      trainerId: trainerUserId,
      studentId: studentUserId,
      date: format(date, 'yyyy-MM-dd'),
      startTime: format(date, 'HH:mm'),
      status: schedule.status || 'SCHEDULED',
      notes: schedule.notes || ''
    });
    setIsModalOpen(true);
  };

  const closeScheduleModal = () => {
    setIsModalOpen(false);
    setEditingScheduleId(null);
    setFormData(defaultForm);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const payload = {
        trainerId: formData.trainerId,
        studentId: formData.studentId,
        startTime: startDateTime.toISOString(),
        status: formData.status,
        notes: formData.notes
      };

      if (editingScheduleId) {
        await api.put(`/schedules/${editingScheduleId}`, payload);
      } else {
        await api.post('/schedules', payload);
      }

      closeScheduleModal();
      setNotice({ type: 'success', text: editingScheduleId ? 'Class schedule was updated successfully.' : 'Class schedule was created successfully.' });
      fetchSchedules();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot save schedule right now.') });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (schedule: any) => {
    setSelectedScheduleForDelete(schedule);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedScheduleForDelete(null);
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!selectedScheduleForDelete) return;
    setDeleting(true);
    setNotice(null);
    try {
      await api.delete(`/schedules/${selectedScheduleForDelete.id}`);
      closeDeleteModal();
      setNotice({ type: 'success', text: 'Class schedule was removed successfully.' });
      fetchSchedules();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot delete schedule right now.') });
    } finally {
      setDeleting(false);
    }
  };

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-emerald-100 text-emerald-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700'
  };

  const filtered = filterStatus === 'ALL'
    ? schedules
    : schedules.filter((s) => s.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Class Schedule</h1>
          <p className="text-slate-500">
            {isAdmin ? 'Manage class schedules and assigned students.' : 'View your assigned classes.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Schedule Class
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {s === 'ALL'
              ? `All (${schedules.length})`
              : `${s.charAt(0) + s.slice(1).toLowerCase()} (${schedules.filter((sc) => sc.status === s).length})`}
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
            <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className={`p-4 border-b flex justify-between items-start ${
                schedule.status === 'COMPLETED'
                  ? 'bg-blue-50 border-blue-100'
                  : schedule.status === 'CANCELLED'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-emerald-500/10 border-emerald-500/10'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    {schedule.status === 'COMPLETED'
                      ? <CheckCircle size={22} className="text-blue-500" />
                      : <CalendarIcon size={22} className="text-emerald-600" />}
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

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {notice.text}
        </div>
      )}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(schedule)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                      title="Edit Schedule"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(schedule)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title="Delete Schedule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{format(new Date(schedule.startTime), 'MMM d, yyyy')}</p>
                    <p className="text-slate-500 text-xs">{format(new Date(schedule.startTime), 'h:mm a')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <Users size={16} className="text-slate-400 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      Trainer: {schedule.trainer?.user?.firstName} {schedule.trainer?.user?.lastName}
                    </p>
                    <p className="text-slate-500 text-xs">
                      Student: {schedule.student?.user?.firstName
                        ? `${schedule.student.user.firstName} ${schedule.student.user.lastName}`
                        : 'Not assigned'}
                    </p>
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
                  onClick={openCreateModal}
                  className="mt-4 text-emerald-600 text-sm font-medium hover:underline"
                >
                  + Schedule the first class
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingScheduleId ? 'Edit Class Schedule' : 'Schedule New Class'}
              </h2>
              <button onClick={closeScheduleModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              <div>
                <RequiredLabel>Assign Trainer</RequiredLabel>
                <select
                  required
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Assign Student</RequiredLabel>
                <select
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Date</RequiredLabel>
                <input
                  type="date"
                  required
                  value={formData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <RequiredLabel>Start Time</RequiredLabel>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {editingScheduleId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ScheduleFormState['status'] })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || trainers.length === 0 || students.length === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex justify-center items-center"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : editingScheduleId ? 'Update' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && selectedScheduleForDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete Schedule</h3>
                <p className="text-sm text-slate-500 mt-1">
                  This will permanently delete the schedule for{' '}
                  <span className="font-medium text-slate-700">
                    {selectedScheduleForDelete.student?.user?.firstName
                      ? `${selectedScheduleForDelete.student.user.firstName} ${selectedScheduleForDelete.student.user.lastName}`
                      : 'the selected student'}
                  </span>.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex justify-center"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

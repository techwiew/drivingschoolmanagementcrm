import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Users, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const { user } = useAuthStore();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentsMap, setStudentsMap] = useState<Record<string, any[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [markingMap, setMarkingMap] = useState<Record<string, Record<string, 'PRESENT' | 'ABSENT'>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/schedules')
      .then(res => setSchedules(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadStudents = async (scheduleId: string) => {
    if (studentsMap[scheduleId]) return;
    setLoadingStudents(scheduleId);
    try {
      const res = await api.get(`/schedules/${scheduleId}/students`);
      setStudentsMap(prev => ({ ...prev, [scheduleId]: res.data }));

      // Pre-fill existing attendance
      const existing: Record<string, 'PRESENT' | 'ABSENT'> = {};
      for (const s of res.data) {
        if (s.attendance) existing[s.id] = s.attendance.status;
      }
      setMarkingMap(prev => ({ ...prev, [scheduleId]: existing }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(null);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadStudents(id);
    }
  };

  const markStudent = (scheduleId: string, studentId: string, status: 'PRESENT' | 'ABSENT') => {
    setMarkingMap(prev => ({
      ...prev,
      [scheduleId]: { ...(prev[scheduleId] || {}), [studentId]: status }
    }));
  };

  const saveAttendance = async (scheduleId: string) => {
    setSaving(true);
    try {
      const studentStatuses = markingMap[scheduleId] || {};
      const attendance = Object.entries(studentStatuses).map(([studentProfileId, status]) => ({
        studentProfileId,
        status
      }));

      await api.post(`/schedules/${scheduleId}/attendance`, { attendance });

      // Mark class as completed
      await api.patch(`/schedules/${scheduleId}/status`, { status: 'COMPLETED' });

      // Refresh
      const res = await api.get('/schedules');
      setSchedules(res.data);

      alert('Attendance saved and class marked as completed!');
    } catch (err: any) {
      alert('Failed to save attendance: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const canMarkAttendance = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-slate-500">
          {canMarkAttendance
            ? 'Expand a class to mark student attendance.'
            : 'View your attendance records below.'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">No classes found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const isExpanded = expandedId === schedule.id;
            const students = studentsMap[schedule.id] || [];
            const marks = markingMap[schedule.id] || {};
            const presentCount = Object.values(marks).filter(v => v === 'PRESENT').length;
            const totalMarked = Object.keys(marks).length;

            return (
              <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(schedule.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{schedule.course?.title}</h3>
                      <p className="text-sm text-slate-500">
                        {format(new Date(schedule.startTime), 'MMM d, yyyy · h:mm a')} – {format(new Date(schedule.endTime), 'h:mm a')}
                        {' · '}
                        Trainer: {schedule.trainer?.user?.firstName} {schedule.trainer?.user?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      schedule.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                      schedule.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {schedule.status}
                    </span>
                    {totalMarked > 0 && (
                      <span className="text-xs text-slate-500">{presentCount}/{totalMarked} present</span>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5">
                    {loadingStudents === schedule.id ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="animate-spin text-emerald-500" size={28} />
                      </div>
                    ) : students.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">No students enrolled in the school yet.</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-5">
                          {students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                  {student.user.firstName[0]}{student.user.lastName[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800 text-sm">
                                    {student.user.firstName} {student.user.lastName}
                                  </p>
                                  <p className="text-xs text-slate-500">{student.user.email}</p>
                                </div>
                              </div>
                              {canMarkAttendance ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => markStudent(schedule.id, student.id, 'PRESENT')}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      marks[student.id] === 'PRESENT'
                                        ? 'bg-emerald-500 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                                    }`}
                                  >
                                    <CheckCircle size={14} /> Present
                                  </button>
                                  <button
                                    onClick={() => markStudent(schedule.id, student.id, 'ABSENT')}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                      marks[student.id] === 'ABSENT'
                                        ? 'bg-red-500 text-white shadow-sm'
                                        : 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-700'
                                    }`}
                                  >
                                    <XCircle size={14} /> Absent
                                  </button>
                                </div>
                              ) : (
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                  marks[student.id] === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                                  marks[student.id] === 'ABSENT' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {marks[student.id] || 'Not Marked'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {canMarkAttendance && (
                          <button
                            onClick={() => saveAttendance(schedule.id)}
                            disabled={saving || Object.keys(marks).length === 0}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2"
                          >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            Save Attendance & Complete Class
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

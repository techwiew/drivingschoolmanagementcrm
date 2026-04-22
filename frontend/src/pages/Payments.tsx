import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { CreditCard, Plus, Search, CheckCircle, Clock, X, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type Notice = { type: 'success' | 'error'; text: string } | null;

const getErrorMessage = (err: any, fallback: string) =>
  err.response?.data?.error || err.response?.data?.details || err.message || fallback;

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

const getStudentDealAmount = (student: any) =>
  Math.max((student?.studentProfile?.totalPaid || 0) + (student?.studentProfile?.balanceDue || 0), 0);

export default function Payments() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ studentId: '', amount: '', method: 'CASH', status: 'PAID', notes: '' });
  const [notice, setNotice] = useState<Notice>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/users');
      setStudents(res.data.filter((u: any) => u.role === 'STUDENT'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
    if (user?.role === 'ADMIN') fetchStudents();
  }, [user]);

  const refreshData = async () => {
    await Promise.all([
      fetchPayments(),
      user?.role === 'ADMIN' ? fetchStudents() : Promise.resolve()
    ]);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.post('/payments', formData);
      setIsModalOpen(false);
      setFormData({ studentId: '', amount: '', method: 'CASH', status: 'PAID', notes: '' });
      setNotice({ type: 'success', text: res.data?.message || 'Payment recorded successfully.' });
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot record payment right now.') });
    } finally {
      setSaving(false);
    }
  };

  const markCollected = async (paymentId: string) => {
    setCollectingId(paymentId);
    setNotice(null);
    try {
      const res = await api.patch(`/payments/${paymentId}/status`, { status: 'PAID' });
      setNotice({ type: 'success', text: res.data?.message || 'Payment marked as collected.' });
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot mark payment as collected right now.') });
    } finally {
      setCollectingId(null);
    }
  };

  const totalCollected = payments
    .filter(p => p.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingTransactions = payments
    .filter(p => p.status === 'PENDING')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remainingBalance = students.reduce((acc, student) => acc + Math.max(student.studentProfile?.balanceDue || 0, 0), 0);
  const selectedStudent = students.find((student) => student.id === formData.studentId);

  const filtered = payments.filter(p => {
    const name = `${p.student?.user?.firstName} ${p.student?.user?.lastName}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const statusColor = (s: string) => {
    if (s === 'PAID') return 'bg-emerald-100 text-emerald-700';
    if (s === 'PENDING') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payments & Invoices</h1>
          <p className="text-slate-500">Track all financial transactions and receipts.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Record Payment
          </button>
        )}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-4 rounded-xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Collected</p>
            <p className="text-2xl font-bold text-slate-800">${totalCollected.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-orange-100 text-orange-600 p-4 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
            <p className="text-2xl font-bold text-slate-800">${remainingBalance.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">${pendingTransactions.toFixed(2)} pending transaction amount</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-xl">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-800">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center text-emerald-500">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Method</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Remaining</th>
                <th className="px-6 py-4 font-medium">Notes</th>
                {user?.role === 'ADMIN' && <th className="px-6 py-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {format(new Date(p.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{p.student?.user?.firstName} {p.student?.user?.lastName}</p>
                    <p className="text-xs text-slate-400">{p.student?.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">${p.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      <CreditCard size={16} className="text-slate-400" />
                      {p.method?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                    ${Math.max((p.remainingAmount ?? p.student?.balanceDue ?? 0), 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{p.notes || '-'}</td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-6 py-4 text-right">
                      {p.status === 'PENDING' ? (
                        <button
                          onClick={() => markCollected(p.id)}
                          disabled={collectingId === p.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {collectingId === p.id && <Loader2 className="animate-spin" size={14} />}
                          Mark Collected
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No action</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'ADMIN' ? 8 : 7} className="p-12 text-center text-slate-400">
                    <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Record Payment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <RequiredLabel>Select Student</RequiredLabel>
                <select
                  required value={formData.studentId}
                  onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Choose a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                  ))}
                </select>
              </div>
              {selectedStudent?.studentProfile && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Total fees: ${getStudentDealAmount(selectedStudent).toFixed(2)} | Paid: ${selectedStudent.studentProfile.totalPaid.toFixed(2)} | Remaining: ${Math.max(selectedStudent.studentProfile.balanceDue || 0, 0).toFixed(2)}
                </div>
              )}
              <div>
                <RequiredLabel>Amount ($)</RequiredLabel>
                <input
                  type="number" step="0.01" required value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="150.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>Method</RequiredLabel>
                  <select value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <RequiredLabel>Status</RequiredLabel>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="PAID">Paid</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                <input
                  type="text" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. First installment"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

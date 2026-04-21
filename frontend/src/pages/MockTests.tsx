import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { FileText, Plus, Search, Clock, CheckCircle, HelpCircle, X, Loader2 } from 'lucide-react';

type Notice = { type: 'success' | 'error'; text: string } | null;

const getErrorMessage = (err: any, fallback: string) =>
  err.response?.data?.error || err.response?.data?.details || err.message || fallback;

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

export default function MockTests() {
  const { user } = useAuthStore();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', passingScore: '70', timeLimitMinutes: '30' });
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<Notice>(null);

  const fetchTests = async () => {
    try {
      const res = await api.get('/mock-tests');
      setTests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api.post('/mock-tests', formData);
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', passingScore: '70', timeLimitMinutes: '30' });
      setNotice({ type: 'success', text: `${formData.title} was created successfully.` });
      fetchTests();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot create mock test right now.') });
    } finally {
      setSaving(false);
    }
  };

  const filtered = tests.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mock Tests</h1>
          <p className="text-slate-500">
            {user?.role === 'STUDENT'
              ? 'View available theory tests.'
              : 'Manage theory tests and track student performance.'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Create Test
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search tests..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filtered.map((test) => (
              <div key={test.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">
                      {test.questions?.length || 0} Qs
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{test.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4">{test.description || 'No description provided.'}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={15} className="text-slate-400" />
                      <span>{test.timeLimitMinutes} minute time limit</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle size={15} className="text-slate-400" />
                      <span>Passing score: {test.passingScore}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-500">
                  {test.results?.length || 0} student{test.results?.length !== 1 ? 's' : ''} attempted
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No Mock Tests Available</h3>
                <p className="text-slate-500 mt-2">
                  {user?.role === 'ADMIN'
                    ? 'Create a test using the button above.'
                    : 'Check back later or ask your admin to create one.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Create Mock Test</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateTest} className="p-6 space-y-4">
              <div>
                <RequiredLabel>Test Title</RequiredLabel>
                <input
                  type="text" required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Traffic Signs & Signals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="What does this test cover?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <RequiredLabel>Passing Score (%)</RequiredLabel>
                  <input type="number" required min="1" max="100" value={formData.passingScore}
                    onChange={e => setFormData({ ...formData, passingScore: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <RequiredLabel>Time Limit (mins)</RequiredLabel>
                  <input type="number" required min="1" value={formData.timeLimitMinutes}
                    onChange={e => setFormData({ ...formData, timeLimitMinutes: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { Search, Plus, Trash2, Lock, Unlock, X, Loader2, FileText, Download } from 'lucide-react';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  location?: string;
  dateOfBirth?: string;
  createdAt: string;
}

interface DocumentData {
  id: string;
  fileName: string;
  fileUrl: string;
  remark: string | null;
  uploadedAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ 
    firstName: '', lastName: '', email: '', password: '', role: 'STUDENT',
    phone: '', location: '', dateOfBirth: ''
  });

  // Document State
  const [documents, setDocuments] = useState<{file: File, remark: string}[]>([]);
  
  // Viewing Documents
  const [viewingDocsUserId, setViewingDocsUserId] = useState<string | null>(null);
  const [userDocs, setUserDocs] = useState<DocumentData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        if (file.size > 1024 * 1024) {
          alert(`File ${file.name} is larger than 1MB limit.`);
          return false;
        }
        return true;
      });

      if (documents.length + validFiles.length > 4) {
        alert('You can only upload up to 4 documents.');
        return;
      }

      setDocuments(prev => [
        ...prev,
        ...validFiles.map(file => ({ file, remark: '' }))
      ]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const updateDocumentRemark = (index: number, remark: string) => {
    setDocuments(prev => {
      const newDocs = [...prev];
      newDocs[index].remark = remark;
      return newDocs;
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });

      documents.forEach((doc, index) => {
        submitData.append('documents', doc.file);
        submitData.append(`remark_${index}`, doc.remark);
      });

      await api.post('/users', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'STUDENT', phone: '', location: '', dateOfBirth: '' });
      setDocuments([]);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to add user: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      await api.patch(`/users/${id}/status`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const viewUserDocuments = async (userId: string) => {
    setViewingDocsUserId(userId);
    setLoadingDocs(true);
    try {
      const res = await api.get(`/users/${userId}/documents`);
      setUserDocs(res.data);
    } catch (err) {
      alert('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Manage students, trainers, and admins.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex justify-center">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Name & Info</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    {(u.phone || u.location) && (
                      <div className="text-xs text-slate-400 mt-1">
                        {u.phone && <span>📞 {u.phone} </span>}
                        {u.location && <span>📍 {u.location}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                      u.role === 'TRAINER' ? 'bg-blue-100 text-blue-700' : 
                      u.role === 'STUDENT' ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 ${
                      u.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm font-medium">{u.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => viewUserDocuments(u.id)}
                      title="View Documents"
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <FileText size={18} />
                    </button>
                    <button 
                      onClick={() => toggleStatus(u.id, u.status)}
                      title={u.status === 'ACTIVE' ? 'Lock User' : 'Unlock User'}
                      className="p-2 text-slate-400 hover:text-orange-500 transition-colors"
                    >
                      {u.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      title="Delete User"
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <form id="addUserForm" onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                    <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                    <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                    <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
                    <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input type="date" required value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="STUDENT">Student</option>
                    <option value="TRAINER">Trainer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {/* Documents Upload */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">Documents (Max 4, 1MB each)</label>
                    <label className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer ${documents.length >= 4 ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                      + Upload File
                      <input type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} disabled={documents.length >= 4} />
                    </label>
                  </div>
                  
                  {documents.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.file.name}</p>
                            <p className="text-xs text-slate-500">{(doc.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <div className="flex-1">
                            <input 
                              type="text" 
                              placeholder="Add a remark..." 
                              value={doc.remark}
                              onChange={(e) => updateDocumentRemark(index, e.target.value)}
                              className="w-full text-sm border border-slate-200 rounded p-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <button type="button" onClick={() => removeDocument(index)} className="text-slate-400 hover:text-red-500 p-1">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-white transition-colors bg-white">
                Cancel
              </button>
              <button form="addUserForm" type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                {saving ? <Loader2 className="animate-spin" /> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Documents Modal */}
      {viewingDocsUserId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">User Documents</h2>
              <button onClick={() => setViewingDocsUserId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {loadingDocs ? (
                <div className="flex justify-center p-8 text-emerald-500"><Loader2 className="animate-spin" size={32} /></div>
              ) : userDocs.length === 0 ? (
                <div className="text-center p-8 text-slate-500">No documents found for this user.</div>
              ) : (
                <div className="space-y-4">
                  {userDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm truncate">{doc.fileName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Remark: {doc.remark || 'N/A'}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <a 
                        href={import.meta.env.PROD ? `/_/backend${doc.fileUrl}` : `http://localhost:5000${doc.fileUrl}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-10 h-10 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 rounded-lg flex items-center justify-center transition-colors shrink-0"
                        title="Download Document"
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setViewingDocsUserId(null)} className="w-full px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-white transition-colors bg-white font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

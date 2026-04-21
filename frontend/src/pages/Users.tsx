import { useEffect, useState } from 'react';
import { Download, FileText, Loader2, Lock, Pencil, Plus, Search, Trash2, Unlock, X } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';

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

type EditUserForm = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  dateOfBirth: string;
  status: 'ACTIVE' | 'LOCKED';
  password: string;
};

export default function Users() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditUserForm>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    dateOfBirth: '',
    status: 'ACTIVE',
    password: ''
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    phone: '',
    location: '',
    dateOfBirth: ''
  });

  const [documents, setDocuments] = useState<{ file: File; remark: string }[]>([]);

  const [viewingDocsUserId, setViewingDocsUserId] = useState<string | null>(null);
  const [userDocs, setUserDocs] = useState<DocumentData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
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
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter((file) => {
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

    setDocuments((prev) => [
      ...prev,
      ...validFiles.map((file) => ({ file, remark: '' }))
    ]);
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDocumentRemark = (index: number, remark: string) => {
    setDocuments((prev) => {
      const next = [...prev];
      next[index].remark = remark;
      return next;
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
      documents.forEach((doc, index) => {
        submitData.append('documents', doc.file);
        submitData.append(`remark_${index}`, doc.remark);
      });

      await api.post('/users', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'STUDENT',
        phone: '',
        location: '',
        dateOfBirth: ''
      });
      setDocuments([]);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to add user: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (target: UserData) => {
    setEditForm({
      id: target.id,
      firstName: target.firstName || '',
      lastName: target.lastName || '',
      email: target.email || '',
      phone: target.phone || '',
      location: target.location || '',
      dateOfBirth: target.dateOfBirth ? new Date(target.dateOfBirth).toISOString().slice(0, 10) : '',
      status: target.status === 'LOCKED' ? 'LOCKED' : 'ACTIVE',
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);
    try {
      const payload: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone,
        location: editForm.location,
        dateOfBirth: editForm.dateOfBirth || null,
        status: editForm.status
      };
      if (editForm.password.trim()) payload.password = editForm.password;

      await api.put(`/users/${editForm.id}`, payload);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Failed to update user: ' + (err.response?.data?.error || err.message));
    } finally {
      setEditing(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) return;
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      await api.patch(`/users/${id}/status`, { status: newStatus });
      fetchUsers();
    } catch {
      alert('Failed to update status');
    }
  };

  const deleteUser = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        try {
          await api.post(`/users/${id}/delete`);
          fetchUsers();
          return;
        } catch (fallbackErr: any) {
          alert('Failed to delete user: ' + (fallbackErr.response?.data?.error || fallbackErr.message));
          return;
        }
      }
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  const viewUserDocuments = async (userId: string) => {
    setViewingDocsUserId(userId);
    setLoadingDocs(true);
    try {
      const res = await api.get(`/users/${userId}/documents`);
      setUserDocs(res.data || []);
    } catch {
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
          <p className="text-slate-500">
            {isAdmin ? 'Manage students, trainers, and admins.' : 'View your accessible users.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Add User
          </button>
        )}
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
                        {u.phone && <span>{u.phone} </span>}
                        {u.location && <span>{u.location}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold ${
                      u.role === 'TRAINER'
                        ? 'bg-blue-100 text-blue-700'
                        : u.role === 'STUDENT'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
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
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit User"
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <Pencil size={18} />
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
                      </>
                    )}
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

      {isAdmin && isModalOpen && (
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
                  <input type="text" placeholder="First Name" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  <input type="text" placeholder="Last Name" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="email" placeholder="Email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  <input type="password" placeholder="Password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <input type="tel" placeholder="Mobile Number" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  <input type="text" placeholder="Location" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  <input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                </div>

                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5">
                  <option value="STUDENT">Student</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="ADMIN">Admin</option>
                </select>

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
                              className="w-full text-sm border border-slate-200 rounded p-1.5"
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

      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Edit User</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First Name" className="w-full border border-slate-200 rounded-lg p-2.5" required />
                <input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last Name" className="w-full border border-slate-200 rounded-lg p-2.5" required />
              </div>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full border border-slate-200 rounded-lg p-2.5" required />
              <div className="grid grid-cols-2 gap-4">
                <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Mobile Number" className="w-full border border-slate-200 rounded-lg p-2.5" />
                <input value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className="w-full border border-slate-200 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2.5" />
                <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as 'ACTIVE' | 'LOCKED' }))} className="w-full border border-slate-200 rounded-lg p-2.5">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOCKED">LOCKED</option>
                </select>
              </div>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="New Password (optional)" className="w-full border border-slate-200 rounded-lg p-2.5" />

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editing} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex justify-center items-center">
                  {editing ? <Loader2 className="animate-spin" /> : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  {userDocs.map((doc) => (
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

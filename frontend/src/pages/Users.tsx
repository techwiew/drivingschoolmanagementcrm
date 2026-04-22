import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2, Lock, Pencil, Plus, Search, Trash2, Unlock, X } from 'lucide-react';
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
  studentProfile?: {
    id: string;
    totalPaid: number;
    balanceDue: number;
  } | null;
}

interface DocumentData {
  id: string;
  fileName: string;
  fileUrl: string;
  remark: string | null;
  uploadedAt: string;
}

type UserDetails = {
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
  documents?: DocumentData[];
  studentProfile?: {
    id: string;
    licenseStatus: string;
    totalPaid: number;
    balanceDue: number;
  } | null;
  trainerProfile?: {
    id: string;
    availabilityStatus: string;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    notes?: string | null;
    createdAt: string;
  }>;
  schedules?: Array<{
    id: string;
    startTime: string;
    status: string;
    course?: { title?: string | null } | null;
    trainer?: { user?: { firstName?: string; lastName?: string } | null } | null;
    student?: { user?: { firstName?: string; lastName?: string } | null } | null;
  }>;
  attendances?: Array<{
    id: string;
    status: string;
    schedule?: {
      startTime: string;
      course?: { title?: string | null } | null;
      trainer?: { user?: { firstName?: string; lastName?: string } | null } | null;
    } | null;
  }>;
  testResults?: Array<{
    id: string;
    score: number;
    attemptedAt: string;
    test?: { title?: string | null } | null;
  }>;
  summary?: {
    totalFees?: number;
    totalPaid?: number;
    balanceDue?: number;
    joinedOn?: string;
    age?: number | null;
    firstJoinedClassAt?: string | null;
    latestPaymentAt?: string | null;
    totalClasses?: number;
    completedClasses?: number;
    upcomingClasses?: number;
    assignedStudents?: number;
    totalDocuments?: number;
  } | null;
};

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

type Notice = { type: 'success' | 'error'; text: string } | null;

const getErrorMessage = (err: any, fallback: string) =>
  err.response?.data?.error || err.response?.data?.details || err.message || fallback;

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1">
    {children} <span className="text-red-500">*</span>
  </label>
);

const getStudentDealAmount = (studentProfile?: UserData['studentProfile']) => {
  if (!studentProfile) return 0;
  return Math.max((studentProfile.totalPaid || 0) + (studentProfile.balanceDue || 0), 0);
};

const getAdultMaxDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
};

export default function Users() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

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
    dateOfBirth: '',
    totalAmount: ''
  });

  const [documents, setDocuments] = useState<{ file: File; remark: string }[]>([]);

  const [viewingDocsUserId, setViewingDocsUserId] = useState<string | null>(null);
  const [userDocs, setUserDocs] = useState<DocumentData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [viewingDetailsUserId, setViewingDetailsUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
        setNotice({ type: 'error', text: `Cannot upload ${file.name} because it is larger than the 1MB limit.` });
        return false;
      }
      return true;
    });

    if (documents.length + validFiles.length > 4) {
      setNotice({ type: 'error', text: 'Cannot upload documents because only 4 files are allowed.' });
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
    setNotice(null);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
      documents.forEach((doc, index) => {
        submitData.append('documents', doc.file);
        submitData.append(`remark_${index}`, doc.remark);
      });

      const res = await api.post('/users', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsModalOpen(false);
      setNotice({ type: 'success', text: res.data?.message || `${formData.firstName} ${formData.lastName} was added successfully.` });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'STUDENT',
        phone: '',
        location: '',
        dateOfBirth: '',
        totalAmount: ''
      });
      setDocuments([]);
      fetchUsers();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot create user right now.') });
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
    setNotice(null);
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
      setNotice({ type: 'success', text: `${editForm.firstName} ${editForm.lastName} was updated successfully.` });
      fetchUsers();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot update user right now.') });
    } finally {
      setEditing(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) return;
    setNotice(null);
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      await api.patch(`/users/${id}/status`, { status: newStatus });
      setNotice({ type: 'success', text: `User status changed to ${newStatus}.` });
      fetchUsers();
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot update user status right now.') });
    }
  };

  const deleteUser = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to delete this user?')) return;

    setNotice(null);
    const target = users.find((u) => u.id === id);
    try {
      const res = await api.delete(`/users/${id}`);
      setNotice({ type: 'success', text: res.data?.message || `${target?.firstName || 'User'} was removed successfully.` });
      fetchUsers();
    } catch (err: any) {
      if (err.response?.status === 403) {
        try {
          const res = await api.post(`/users/${id}/delete`);
          setNotice({ type: 'success', text: res.data?.message || `${target?.firstName || 'User'} was removed successfully.` });
          fetchUsers();
          return;
        } catch (fallbackErr: any) {
          setNotice({ type: 'error', text: getErrorMessage(fallbackErr, 'Cannot delete user right now.') });
          return;
        }
      }
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot delete user right now.') });
    }
  };

  const viewUserDocuments = async (userId: string) => {
    setViewingDocsUserId(userId);
    setLoadingDocs(true);
    try {
      const res = await api.get(`/users/${userId}/documents`);
      setUserDocs(res.data || []);
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot load documents right now.') });
    } finally {
      setLoadingDocs(false);
    }
  };

  const viewUserDetails = async (userId: string) => {
    setViewingDetailsUserId(userId);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/users/${userId}/details`);
      setUserDetails(res.data);
    } catch (err: any) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Cannot load user details right now.') });
      setViewingDetailsUserId(null);
      setUserDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeUserDetails = () => {
    setViewingDetailsUserId(null);
    setUserDetails(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">
            {isAdmin ? 'Manage students and trainers.' : 'View your accessible users.'}
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
                    {u.role === 'STUDENT' && u.studentProfile && (
                      <div className="text-xs text-slate-400 mt-1">
                        Total fees: ${getStudentDealAmount(u.studentProfile).toFixed(2)} | Paid: ${u.studentProfile.totalPaid.toFixed(2)} | Remaining: ${Math.max(u.studentProfile.balanceDue, 0).toFixed(2)}
                      </div>
                    )}
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
                      onClick={() => viewUserDetails(u.id)}
                      title="View Details"
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Eye size={18} />
                    </button>
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
                  <div>
                    <RequiredLabel>First Name</RequiredLabel>
                    <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                  <div>
                    <RequiredLabel>Last Name</RequiredLabel>
                    <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <RequiredLabel>Email</RequiredLabel>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                  <div>
                    <RequiredLabel>Password</RequiredLabel>
                    <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <RequiredLabel>Mobile Number</RequiredLabel>
                    <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                  <div>
                    <RequiredLabel>Location</RequiredLabel>
                    <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                  <div>
                    <RequiredLabel>Date of Birth</RequiredLabel>
                    <input type="date" required max={getAdultMaxDate()} value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <RequiredLabel>Role</RequiredLabel>
                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2.5">
                      <option value="STUDENT">Student</option>
                      <option value="TRAINER">Trainer</option>
                    </select>
                  </div>
                  {formData.role === 'STUDENT' && (
                    <div>
                      <RequiredLabel>Total Fees</RequiredLabel>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.totalAmount}
                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

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
                <div>
                  <RequiredLabel>First Name</RequiredLabel>
                  <input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2.5" required />
                </div>
                <div>
                  <RequiredLabel>Last Name</RequiredLabel>
                  <input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2.5" required />
                </div>
              </div>
              <div>
                <RequiredLabel>Email</RequiredLabel>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2.5" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Mobile Number" className="w-full border border-slate-200 rounded-lg p-2.5" />
                <input value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className="w-full border border-slate-200 rounded-lg p-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" max={getAdultMaxDate()} value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className="w-full border border-slate-200 rounded-lg p-2.5" />
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

      {viewingDetailsUserId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-800">User Details</h2>
                {userDetails && (
                  <p className="text-sm text-slate-500 mt-1">
                    {userDetails.firstName} {userDetails.lastName} · {userDetails.role}
                  </p>
                )}
              </div>
              <button onClick={closeUserDetails} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="flex justify-center p-12 text-emerald-500">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : userDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</p>
                      <p className="text-lg font-bold text-slate-800 mt-2">{new Date(userDetails.summary?.joinedOn || userDetails.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {userDetails.role === 'STUDENT' ? 'Total Fees' : 'Classes'}
                      </p>
                      <p className="text-lg font-bold text-slate-800 mt-2">
                        {userDetails.role === 'STUDENT'
                          ? `$${(userDetails.summary?.totalFees || 0).toFixed(2)}`
                          : userDetails.summary?.totalClasses || 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {userDetails.role === 'STUDENT' ? 'Total Paid' : 'Upcoming Classes'}
                      </p>
                      <p className="text-lg font-bold text-slate-800 mt-2">
                        {userDetails.role === 'STUDENT'
                          ? `$${(userDetails.summary?.totalPaid || 0).toFixed(2)}`
                          : userDetails.summary?.upcomingClasses || 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {userDetails.role === 'STUDENT' ? 'Total Due' : userDetails.role === 'TRAINER' ? 'Assigned Students' : 'Documents'}
                      </p>
                      <p className="text-lg font-bold text-slate-800 mt-2">
                        {userDetails.role === 'STUDENT'
                          ? `$${(userDetails.summary?.balanceDue || 0).toFixed(2)}`
                          : userDetails.role === 'TRAINER'
                          ? userDetails.summary?.assignedStudents || 0
                          : userDetails.summary?.totalDocuments || 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-slate-100 p-5">
                      <h3 className="text-base font-bold text-slate-800 mb-4">Profile</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Email</p>
                          <p className="text-slate-800 font-medium">{userDetails.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Mobile</p>
                          <p className="text-slate-800 font-medium">{userDetails.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Location</p>
                          <p className="text-slate-800 font-medium">{userDetails.location || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Date of Birth</p>
                          <p className="text-slate-800 font-medium">
                            {userDetails.dateOfBirth ? new Date(userDetails.dateOfBirth).toLocaleDateString() : '-'}
                          </p>
                        </div>
                        {userDetails.role === 'STUDENT' && (
                          <div>
                            <p className="text-slate-400">Age</p>
                            <p className="text-slate-800 font-medium">{userDetails.summary?.age ?? '-'}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-400">Status</p>
                          <p className="text-slate-800 font-medium">{userDetails.status}</p>
                        </div>
                        {userDetails.studentProfile && (
                          <div>
                            <p className="text-slate-400">License Status</p>
                            <p className="text-slate-800 font-medium">{userDetails.studentProfile.licenseStatus}</p>
                          </div>
                        )}
                        {userDetails.role === 'STUDENT' && (
                          <>
                            <div>
                              <p className="text-slate-400">First Class Joined</p>
                              <p className="text-slate-800 font-medium">
                                {userDetails.summary?.firstJoinedClassAt ? new Date(userDetails.summary.firstJoinedClassAt).toLocaleString() : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Latest Payment</p>
                              <p className="text-slate-800 font-medium">
                                {userDetails.summary?.latestPaymentAt ? new Date(userDetails.summary.latestPaymentAt).toLocaleString() : '-'}
                              </p>
                            </div>
                          </>
                        )}
                        {userDetails.trainerProfile && (
                          <div>
                            <p className="text-slate-400">Availability</p>
                            <p className="text-slate-800 font-medium">{userDetails.trainerProfile.availabilityStatus}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-5">
                      <h3 className="text-base font-bold text-slate-800 mb-4">Documents</h3>
                      <div className="space-y-3">
                        {(userDetails.documents || []).slice(0, 5).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                              <p className="text-xs text-slate-400">{doc.remark || 'No remark'}</p>
                            </div>
                            <a
                              href={import.meta.env.PROD ? `/_/backend${doc.fileUrl}` : `http://localhost:5000${doc.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        ))}
                        {(userDetails.documents || []).length === 0 && (
                          <p className="text-sm text-slate-400">No documents uploaded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {userDetails.role === 'STUDENT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-slate-100 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Payments</h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                          {(userDetails.payments || []).map((payment) => (
                            <div key={payment.id} className="rounded-lg bg-slate-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-800">${payment.amount.toFixed(2)}</p>
                                <span className="text-xs font-medium text-slate-500">{payment.status}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {payment.method} · {new Date(payment.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{payment.notes || 'No notes'}</p>
                            </div>
                          ))}
                          {(userDetails.payments || []).length === 0 && (
                            <p className="text-sm text-slate-400">No payments recorded.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Classes Joined</h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                          {(userDetails.schedules || []).map((schedule) => (
                            <div key={schedule.id} className="rounded-lg bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-800">{schedule.course?.title || 'Untitled Course'}</p>
                              <p className="text-xs text-slate-500 mt-1">{new Date(schedule.startTime).toLocaleString()}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Trainer: {schedule.trainer?.user?.firstName || '-'} {schedule.trainer?.user?.lastName || ''}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">Status: {schedule.status}</p>
                            </div>
                          ))}
                          {(userDetails.schedules || []).length === 0 && (
                            <p className="text-sm text-slate-400">No classes assigned yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Attendance</h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                          {(userDetails.attendances || []).map((attendance) => (
                            <div key={attendance.id} className="rounded-lg bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-800">{attendance.schedule?.course?.title || 'Class Session'}</p>
                              <p className="text-xs text-slate-500 mt-1">{attendance.schedule?.startTime ? new Date(attendance.schedule.startTime).toLocaleString() : '-'}</p>
                              <p className="text-xs text-slate-400 mt-1">Marked {attendance.status}</p>
                            </div>
                          ))}
                          {(userDetails.attendances || []).length === 0 && (
                            <p className="text-sm text-slate-400">No attendance records yet.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 p-5">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Mock Test Results</h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                          {(userDetails.testResults || []).map((result) => (
                            <div key={result.id} className="rounded-lg bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-800">{result.test?.title || 'Mock Test'}</p>
                              <p className="text-xs text-slate-500 mt-1">Score: {result.score}%</p>
                              <p className="text-xs text-slate-400 mt-1">{new Date(result.attemptedAt).toLocaleString()}</p>
                            </div>
                          ))}
                          {(userDetails.testResults || []).length === 0 && (
                            <p className="text-sm text-slate-400">No mock test attempts yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {userDetails.role === 'TRAINER' && (
                    <div className="rounded-xl border border-slate-100 p-5">
                      <h3 className="text-base font-bold text-slate-800 mb-4">Assigned Classes</h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {(userDetails.schedules || []).map((schedule) => (
                          <div key={schedule.id} className="rounded-lg bg-slate-50 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-800">{schedule.course?.title || 'Untitled Course'}</p>
                              <span className="text-xs text-slate-500">{schedule.status}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{new Date(schedule.startTime).toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Student: {schedule.student?.user?.firstName || '-'} {schedule.student?.user?.lastName || ''}
                            </p>
                          </div>
                        ))}
                        {(userDetails.schedules || []).length === 0 && (
                          <p className="text-sm text-slate-400">No classes assigned yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500">No details found for this user.</div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={closeUserDetails} className="w-full px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-white transition-colors bg-white font-medium">
                Close
              </button>
            </div>
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

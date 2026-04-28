import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Loader2, Mail, Shield, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';

type ResetForm = {
  mobile: string;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'TRAINER';
  password: string;
  confirmPassword: string;
};

type SchoolForm = {
  schoolName: string;
  schoolOwnerName: string;
  schoolMobileNumber: string;
  schoolEmail: string;
  ownerEmail: string;
  ownerMobile: string;
  schoolLocation: string;
  password: string;
  location: string;
  city: string;
  pincode: string;
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetForm, setResetForm] = useState<ResetForm>({
    mobile: '',
    email: '',
    role: 'ADMIN',
    password: '',
    confirmPassword: ''
  });

  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminToken, setSuperAdminToken] = useState('');
  const [superAdminName, setSuperAdminName] = useState('');
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminError, setSuperAdminError] = useState('');
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState('');
  const [schoolError, setSchoolError] = useState('');
  const [schoolForm, setSchoolForm] = useState<SchoolForm>({
    schoolName: '',
    schoolOwnerName: '',
    schoolMobileNumber: '',
    schoolEmail: '',
    ownerEmail: '',
    ownerMobile: '',
    schoolLocation: '',
    password: '',
    location: '',
    city: '',
    pincode: ''
  });

  const resetSuperAdminState = () => {
    setSuperAdminEmail('');
    setSuperAdminPassword('');
    setSuperAdminToken('');
    setSuperAdminName('');
    setSuperAdminLoading(false);
    setSuperAdminError('');
    setSchoolSaving(false);
    setSchoolMessage('');
    setSchoolError('');
    setSchoolForm({
      schoolName: '',
      schoolOwnerName: '',
      schoolMobileNumber: '',
      schoolEmail: '',
      ownerEmail: '',
      ownerMobile: '',
      schoolLocation: '',
      password: '',
      location: '',
      city: '',
      pincode: ''
    });
  };

  const closeSuperAdminModal = () => {
    setShowSuperAdminModal(false);
    resetSuperAdminState();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      const details = err.response?.data?.details;
      const errorMsg = err.response?.data?.error || 'Invalid credentials';
      setError(details ? `${errorMsg}: ${details}` : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    setResetError('');
    setResetLoading(true);
    try {
      const res = await api.post('/auth/reset-password', resetForm);
      setResetMessage(res.data.message || 'Password reset successful');
      setResetForm({
        mobile: '',
        email: '',
        role: 'ADMIN',
        password: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setResetError(err.response?.data?.error || err.response?.data?.details || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminError('');
    setSuperAdminLoading(true);
    try {
      const res = await api.post('/super-admin/login', {
        email: superAdminEmail,
        password: superAdminPassword
      });
      setSuperAdminToken(res.data.token);
      setSuperAdminName(res.data.superAdmin?.name || 'Super Admin');
    } catch (err: any) {
      setSuperAdminError(err.response?.data?.error || 'Super admin login failed');
    } finally {
      setSuperAdminLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolMessage('');
    setSchoolError('');
    setSchoolSaving(true);
    try {
      const res = await api.post('/super-admin/schools', schoolForm, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      setSchoolMessage(res.data.message || 'Driving school created successfully');
      setSchoolForm({
        schoolName: '',
        schoolOwnerName: '',
        schoolMobileNumber: '',
        schoolEmail: '',
        ownerEmail: '',
        ownerMobile: '',
        schoolLocation: '',
        password: '',
        location: '',
        city: '',
        pincode: ''
      });
    } catch (err: any) {
      setSchoolError(err.response?.data?.error || err.response?.data?.details || 'Failed to create school');
    } finally {
      setSchoolSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 pt-20">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-20">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <span className="bg-emerald-500 text-white p-2 rounded-xl text-2xl">DS</span> drivingsync
            </h1>
            <p className="text-slate-500 text-lg">Sign in to your account to continue.</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 mb-6">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-red-800 font-medium text-sm">Login Failed</h3>
                <p className="text-red-700 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="admin@drivingsync.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Sign in to Dashboard'}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setShowResetModal(true)}
              className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-100 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Reset Password
            </button>
            <button
              onClick={() => setShowSuperAdminModal(true)}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              Super Admin Login
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-slate-900 z-10" />
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop"
          alt="Driving School"
          className="object-cover w-full h-full opacity-60"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-20">
          <h2 className="text-4xl font-bold text-white mb-4">Drive smarter, manage faster</h2>
          <p className="text-slate-300 text-lg max-w-md">
            One platform for driving schools to run schedules, attendance, payments, mock tests, and users.
          </p>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <input
                type="tel"
                placeholder="Mobile Number"
                value={resetForm.mobile}
                onChange={(e) => setResetForm((prev) => ({ ...prev, mobile: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg p-2.5"
                required
              />
              <input
                type="email"
                placeholder="Email ID"
                value={resetForm.email}
                onChange={(e) => setResetForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg p-2.5"
                required
              />
              <select
                value={resetForm.role}
                onChange={(e) => setResetForm((prev) => ({ ...prev, role: e.target.value as ResetForm['role'] }))}
                className="w-full border border-slate-200 rounded-lg p-2.5"
              >
                <option value="ADMIN">Admin</option>
                <option value="STUDENT">Student</option>
                <option value="TRAINER">Trainer</option>
              </select>
              <input
                type="password"
                placeholder="New Password"
                value={resetForm.password}
                onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg p-2.5"
                required
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={resetForm.confirmPassword}
                onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg p-2.5"
                required
              />

              {resetError && <p className="text-sm text-red-600">{resetError}</p>}
              {resetMessage && <p className="text-sm text-emerald-600">{resetMessage}</p>}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-emerald-600 text-white rounded-xl py-2.5 hover:bg-emerald-700 transition-colors flex justify-center"
              >
                {resetLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showSuperAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Super Admin Portal</h3>
              <button onClick={closeSuperAdminModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {!superAdminToken ? (
              <form onSubmit={handleSuperAdminLogin} className="p-5 space-y-4">
                <input
                  type="email"
                  value={superAdminEmail}
                  onChange={(e) => setSuperAdminEmail(e.target.value)}
                  placeholder="Super Admin Email"
                  className="w-full border border-slate-200 rounded-lg p-2.5"
                  required
                />
                <input
                  type="password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder="Super Admin Password"
                  className="w-full border border-slate-200 rounded-lg p-2.5"
                  required
                />
                {superAdminError && <p className="text-sm text-red-600">{superAdminError}</p>}
                <button
                  type="submit"
                  disabled={superAdminLoading}
                  className="w-full bg-slate-900 text-white rounded-xl py-2.5 hover:bg-slate-800 transition-colors flex justify-center"
                >
                  {superAdminLoading ? <Loader2 size={18} className="animate-spin" /> : 'Login as Super Admin'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateSchool} className="p-5 space-y-4">
                <p className="text-sm text-slate-600">Logged in as <span className="font-semibold">{superAdminName}</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Driving School Name" value={schoolForm.schoolName} onChange={(e) => setSchoolForm((p) => ({ ...p, schoolName: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" required />
                  <input placeholder="Driving School Owner Name" value={schoolForm.schoolOwnerName} onChange={(e) => setSchoolForm((p) => ({ ...p, schoolOwnerName: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" required />
                  <input placeholder="Driving School Mobile Number" value={schoolForm.schoolMobileNumber} onChange={(e) => setSchoolForm((p) => ({ ...p, schoolMobileNumber: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="Driving School Email" value={schoolForm.schoolEmail} onChange={(e) => setSchoolForm((p) => ({ ...p, schoolEmail: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="Driving School Owner Email" value={schoolForm.ownerEmail} onChange={(e) => setSchoolForm((p) => ({ ...p, ownerEmail: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" required />
                  <input placeholder="Driving School Owner Mobile" value={schoolForm.ownerMobile} onChange={(e) => setSchoolForm((p) => ({ ...p, ownerMobile: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="Driving School Location" value={schoolForm.schoolLocation} onChange={(e) => setSchoolForm((p) => ({ ...p, schoolLocation: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="Driving School Password" type="password" value={schoolForm.password} onChange={(e) => setSchoolForm((p) => ({ ...p, password: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" required />
                  <input placeholder="Location" value={schoolForm.location} onChange={(e) => setSchoolForm((p) => ({ ...p, location: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="City" value={schoolForm.city} onChange={(e) => setSchoolForm((p) => ({ ...p, city: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5" />
                  <input placeholder="Pincode" value={schoolForm.pincode} onChange={(e) => setSchoolForm((p) => ({ ...p, pincode: e.target.value }))} className="border border-slate-200 rounded-lg p-2.5 md:col-span-2" />
                </div>
                {schoolError && <p className="text-sm text-red-600">{schoolError}</p>}
                {schoolMessage && <p className="text-sm text-emerald-600">{schoolMessage}</p>}
                <button
                  type="submit"
                  disabled={schoolSaving}
                  className="w-full bg-emerald-600 text-white rounded-xl py-2.5 hover:bg-emerald-700 transition-colors flex justify-center"
                >
                  {schoolSaving ? <Loader2 size={18} className="animate-spin" /> : 'Create Driving School'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { KeyRound, Mail, AlertCircle, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const DEMO_CREDS = [
  { role: 'Admin', email: 'admin@driveflow.com', password: 'Admin@123', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { role: 'Trainer', email: 'trainer@driveflow.com', password: 'Trainer@123', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { role: 'Student', email: 'student@driveflow.com', password: 'Student@123', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

export default function Login() {
  const [email, setEmail] = useState('admin@driveflow.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSetup = async () => {
    setSetupLoading(true);
    setSetupMsg('');
    try {
      const res = await api.post('/setup');
      setSetupMsg(res.data.message || 'Setup complete! You can now login.');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.details || 'Setup failed.';
      setSetupMsg(msg);
    } finally {
      setSetupLoading(false);
    }
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

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-20">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <span className="bg-emerald-500 text-white p-2 rounded-xl text-2xl">🚘</span> DriveFlow
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
                  placeholder="admin@driveflow.com"
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
                  placeholder="••••••••"
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

          {/* Quick Login */}
          <div className="mt-6">
            <button
              onClick={() => setShowCreds(v => !v)}
              className="w-full flex items-center justify-between text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl px-4 py-3 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <span>Quick Login (Demo Accounts)</span>
              {showCreds ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showCreds && (
              <div className="mt-3 space-y-2">
                {DEMO_CREDS.map(cred => (
                  <button
                    key={cred.role}
                    onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                    className={`w-full text-left flex items-center justify-between p-3 rounded-xl border text-sm transition-all hover:shadow-sm ${cred.color}`}
                  >
                    <span className="font-semibold">{cred.role}</span>
                    <span className="text-xs opacity-70">{cred.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Setup */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center mb-3">First time? Initialize the database below.</p>
            {setupMsg && (
              <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>{setupMsg}</span>
              </div>
            )}
            <button
              onClick={handleSetup}
              disabled={setupLoading}
              className="w-full flex justify-center items-center gap-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-colors disabled:opacity-60"
            >
              {setupLoading ? <Loader2 className="animate-spin" size={14} /> : null}
              {setupLoading ? 'Setting up...' : '⚙️ Run Initial DB Setup'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Hero */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-slate-900 z-10" />
        <img
          src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop"
          alt="Driving School"
          className="object-cover w-full h-full opacity-60"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-20">
          <div className="flex gap-3 mb-6">
            {DEMO_CREDS.map(c => (
              <span key={c.role} className="text-xs text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                {c.role}
              </span>
            ))}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Master the road<br />with DriveFlow</h2>
          <p className="text-slate-300 text-lg max-w-md">
            The complete driving school management platform — schedules, attendance, payments & tests in one place.
          </p>
        </div>
      </div>
    </div>
  );
}

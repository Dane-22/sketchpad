import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { authApi } from '../features/auth/services/authApi';
import { Eye, EyeOff, ShieldCheck, Clock, AlertCircle, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ENGINEER' | 'ARCHITECT'>('ENGINEER');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [error, setError] = useState<{ message: string; status?: string; reason?: string } | null>(null);
  const [pendingSuccessData, setPendingSuccessData] = useState<{ fullName: string; email: string } | null>(null);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const data = await authApi.login({ email, password });
        setAuth(data.token, data.user);
        if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'ADMIN') {
          navigate('/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        const data = await authApi.register({ email, password, fullName, role });
        if (data.status === 'PENDING') {
          setPendingSuccessData({ fullName, email });
        } else if (data.token) {
          // In case first user auto-approved
          setAuth(data.token, data.user);
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.status === 'PENDING') {
        setError({
          message: resp.error || 'Your account is pending review by a Super Admin.',
          status: 'PENDING',
        });
      } else if (resp?.status === 'REJECTED') {
        setError({
          message: resp.error || 'Your registration was not approved.',
          status: 'REJECTED',
          reason: resp.reason || 'Application declined by Super Admin',
        });
      } else if (resp?.status === 'SUSPENDED') {
        setError({
          message: resp.error || 'Your account has been suspended.',
          status: 'SUSPENDED',
        });
      } else {
        setError({
          message: resp?.error || 'An error occurred. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setError(null);
    setPendingSuccessData(null);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-md bg-[#161822] p-8 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* PENDING CONFIRMATION SCREEN */}
        {pendingSuccessData ? (
          <div className="text-center py-4 space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
              <Clock size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Thank you, <span className="text-white font-semibold">{pendingSuccessData.fullName}</span>. Your registration request has been forwarded to the <span className="text-amber-400 font-medium">Super Admin</span> for review.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-medium text-white">{pendingSuccessData.fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-white">{pendingSuccessData.email}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/30">
                  <Clock size={10} /> Pending Approval
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Once approved by the Super Admin, you will be able to log in with your email and password.
            </p>

            <button
              onClick={() => {
                resetForm();
                setIsLogin(true);
              }}
              className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-all border border-white/10"
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                {isLogin ? <UserCheck size={24} /> : <ShieldCheck size={24} />}
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-sm text-slate-400">
                {isLogin ? 'Log in to access your CAD workspaces' : 'Apply for an engineer or architect account'}
              </p>
            </div>

            {/* ERROR / STATUS NOTICES */}
            {error && (
              <div className={`p-4 rounded-xl mb-6 text-sm border flex items-start gap-3 ${
                error.status === 'PENDING'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : error.status === 'REJECTED'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : error.status === 'SUSPENDED'
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {error.status === 'PENDING' ? (
                  <Clock size={18} className="shrink-0 mt-0.5 text-amber-400" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
                )}
                <div>
                  <p className="font-semibold">{error.message}</p>
                  {error.reason && (
                    <p className="mt-1 text-xs text-red-300/80">Reason: {error.reason}</p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#0d0e15] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="e.g. Daniel Rillera"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Requested Role</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as any)}
                      className="w-full bg-[#0d0e15] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="ENGINEER">Engineer (CAD & Spatial Planning)</option>
                      <option value="ARCHITECT">Architect (Layouts & Architecture)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0d0e15] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#0d0e15] border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={16} className="text-slate-400 hover:text-white" />
                    ) : (
                      <Eye size={16} className="text-slate-400 hover:text-white" />
                    )}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-6 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isLogin ? (
                  'Log In'
                ) : (
                  'Submit Registration for Review'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setError(null);
                  setIsLogin(!isLogin);
                }}
                className="text-slate-400 hover:text-white transition-colors text-xs font-medium"
              >
                {isLogin ? "Don't have an account? Sign up for review" : "Already have an approved account? Log in"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


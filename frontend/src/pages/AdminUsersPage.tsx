import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
  Trash2,
  UserCheck,
  Crown,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Mail,
  Calendar,
  X
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { NotificationBellDropdown } from '../components/notifications/NotificationBellDropdown';
import { socket } from '../features/planner/utils/socket';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ENGINEER' | 'ARCHITECT' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  superAdmins: number;
  admins: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    superAdmins: 0,
    admins: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Rejection modal state
  const [rejectingUser, setRejectingUser] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  // Success message flash
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const { token, user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const showSuccessBanner = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Fetch users & statistics
  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        axios.get<{ users: AdminUser[] }>(`/api/v1/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            status: statusFilter,
            role: roleFilter,
            search: searchQuery,
          },
        }),
        axios.get<UserStats>(`/api/v1/admin/users/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUsers(usersRes.data.users);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load admin user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Socket.io updates for new registrations & status changes
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleNewUser = (newUser: any) => {
      setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id)]);
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
      }));
      showSuccessBanner(`🔔 New registration: ${newUser.fullName} (${newUser.email})`);
    };

    const handleStatusChanged = (payload: { userId: string; status: string; role?: string; reason?: string }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === payload.userId
            ? {
                ...u,
                status: payload.status as any,
                role: (payload.role as any) || u.role,
                rejectionReason: payload.reason,
              }
            : u
        )
      );
      // Refresh stats
      axios
        .get<UserStats>(`/api/v1/admin/users/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setStats(res.data))
        .catch(() => {});
    };

    const handleUserDeleted = (payload: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== payload.userId));
      setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    };

    socket.on('admin-user-registered', handleNewUser);
    socket.on('admin-user-status-changed', handleStatusChanged);
    socket.on('admin-user-deleted', handleUserDeleted);

    return () => {
      socket.off('admin-user-registered', handleNewUser);
      socket.off('admin-user-status-changed', handleStatusChanged);
      socket.off('admin-user-deleted', handleUserDeleted);
    };
  }, [token]);

  // Action: Approve user
  const handleApprove = async (user: AdminUser, assignedRole?: string) => {
    if (!token) return;
    setIsSubmittingAction(true);
    try {
      await axios.put(
        `/api/v1/admin/users/${user.id}/approve`,
        { role: assignedRole || user.role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccessBanner(`✅ Approved ${user.fullName} as ${assignedRole || user.role}`);
      fetchData();
    } catch (error: any) {
      console.error('Failed to approve user:', error);
      alert(error.response?.data?.error || 'Failed to approve user');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Reject user
  const handleConfirmReject = async () => {
    if (!token || !rejectingUser) return;
    setIsSubmittingAction(true);
    try {
      await axios.put(
        `/api/v1/admin/users/${rejectingUser.id}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccessBanner(`❌ Rejected application for ${rejectingUser.fullName}`);
      setRejectingUser(null);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      console.error('Failed to reject user:', error);
      alert(error.response?.data?.error || 'Failed to reject user');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Change role (Promote to Super Admin, Admin, etc.)
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    setIsSubmittingAction(true);
    try {
      await axios.put(
        `/api/v1/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccessBanner(`🛡️ User role successfully updated to ${newRole}`);
      fetchData();
    } catch (error: any) {
      console.error('Failed to change role:', error);
      alert(error.response?.data?.error || 'Failed to change role');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action: Delete user
  const handleConfirmDelete = async () => {
    if (!token || !deletingUser) return;
    setIsSubmittingAction(true);
    try {
      await axios.delete(`/api/v1/admin/users/${deletingUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccessBanner(`🗑️ User ${deletingUser.fullName} permanently deleted`);
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-slate-200 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-[#161822]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium"
            title="Return to Dashboard"
          >
            <ArrowLeft size={18} />
            <span>Dashboard</span>
          </button>
          <div className="h-5 w-px bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                User Access & Approvals
                {isSuperAdmin && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Crown size={10} /> Super Admin
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBellDropdown />
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {currentUser?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-none">{currentUser?.fullName}</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{currentUser?.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Flash Success Banner */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl flex items-center justify-between text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 font-medium">
              <Sparkles size={18} className="text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending Approvals Card */}
          <div
            onClick={() => setStatusFilter('PENDING')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                : 'bg-[#161822]/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pending Review</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{stats.pending}</span>
              {stats.pending > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-black animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Applicants waiting for decision</p>
          </div>

          {/* Approved Users Card */}
          <div
            onClick={() => setStatusFilter('APPROVED')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                : 'bg-[#161822]/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Approved</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.approved}</div>
            <p className="text-xs text-slate-400 mt-1">Engineers & Architects with access</p>
          </div>

          {/* Super Admins Card */}
          <div
            onClick={() => {
              setStatusFilter('ALL');
              setRoleFilter('SUPER_ADMIN');
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              roleFilter === 'SUPER_ADMIN'
                ? 'bg-purple-500/15 border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.15)]'
                : 'bg-[#161822]/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Administrators</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Crown size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.superAdmins + stats.admins}</div>
            <p className="text-xs text-slate-400 mt-1">{stats.superAdmins} Super Admins, {stats.admins} Admins</p>
          </div>

          {/* Rejected Card */}
          <div
            onClick={() => setStatusFilter('REJECTED')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              statusFilter === 'REJECTED'
                ? 'bg-red-500/15 border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.15)]'
                : 'bg-[#161822]/60 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Rejected</span>
              <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <XCircle size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">{stats.rejected}</div>
            <p className="text-xs text-slate-400 mt-1">Declined registration requests</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#161822]/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-xl">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Clock size={14} />
              Pending Approvals
              {stats.pending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'PENDING' ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {stats.pending}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CheckCircle2 size={14} />
              Approved ({stats.approved})
            </button>

            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <XCircle size={14} />
              Rejected ({stats.rejected})
            </button>

            <button
              onClick={() => {
                setStatusFilter('ALL');
                setRoleFilter('ALL');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                statusFilter === 'ALL' && roleFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Users ({stats.total})
            </button>
          </div>

          {/* Search & Role Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0e15] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#0d0e15] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ALL">All Roles</option>
              <option value="ENGINEER">Engineers</option>
              <option value="ARCHITECT">Architects</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>

            <button
              onClick={fetchData}
              className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Users Table / List */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs">Loading user registry...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center bg-[#161822]/40 border border-white/5 rounded-3xl backdrop-blur-xl">
            <UserCheck size={40} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No users found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter === 'PENDING'
                ? 'There are currently no registration requests awaiting approval.'
                : 'No registered users match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="bg-[#161822]/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl divide-y divide-white/5">
            {users.map((u) => {
              const isCurrentUserRow = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/[0.02] ${
                    u.status === 'PENDING' ? 'bg-amber-500/[0.03]' : ''
                  }`}
                >
                  {/* Left: User Avatar & Info */}
                  <div className="flex items-start md:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
                      {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm tracking-tight">{u.fullName}</span>
                        
                        {/* Status Badge */}
                        {u.status === 'PENDING' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock size={10} /> Pending Approval
                          </span>
                        )}
                        {u.status === 'APPROVED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Approved
                          </span>
                        )}
                        {u.status === 'REJECTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                            <XCircle size={10} /> Rejected
                          </span>
                        )}

                        {/* Role Badge */}
                        {u.role === 'SUPER_ADMIN' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Crown size={10} /> Super Admin
                          </span>
                        )}
                        {u.role === 'ADMIN' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Admin
                          </span>
                        )}
                        {u.role === 'ENGINEER' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Engineer
                          </span>
                        )}
                        {u.role === 'ARCHITECT' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Architect
                          </span>
                        )}

                        {isCurrentUserRow && (
                          <span className="text-[10px] text-slate-500 font-semibold">(You)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Mail size={12} className="text-slate-500" />
                          {u.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Calendar size={12} />
                          Registered {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Rejection reason if any */}
                      {u.status === 'REJECTED' && u.rejectionReason && (
                        <p className="text-xs text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 mt-1">
                          <span className="font-semibold">Declined Reason:</span> {u.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
                    {/* PENDING ACTIONS */}
                    {u.status === 'PENDING' && (
                      <>
                        <button
                          disabled={isSubmittingAction}
                          onClick={() => handleApprove(u)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>

                        <button
                          disabled={isSubmittingAction}
                          onClick={() => {
                            setRejectingUser(u);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}

                    {/* APPROVED ACTIONS: Role Switcher */}
                    {u.status === 'APPROVED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 hidden sm:inline">Role:</span>
                        <select
                          disabled={isSubmittingAction || (u.role === 'SUPER_ADMIN' && !isSuperAdmin)}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-[#0d0e15] border border-white/10 hover:border-white/20 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
                        >
                          <option value="ENGINEER">Engineer</option>
                          <option value="ARCHITECT">Architect</option>
                          <option value="ADMIN">Admin</option>
                          {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                        </select>
                      </div>
                    )}

                    {/* REJECTED ACTIONS: Re-evaluate */}
                    {u.status === 'REJECTED' && (
                      <button
                        disabled={isSubmittingAction}
                        onClick={() => handleApprove(u)}
                        className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        Re-Approve
                      </button>
                    )}

                    {/* DELETE USER (Super Admins can delete any user except themselves) */}
                    {!isCurrentUserRow && (
                      <button
                        disabled={isSubmittingAction}
                        onClick={() => setDeletingUser(u)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* REJECT REASON MODAL */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161822] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Reject Registration</h3>
                <p className="text-xs text-slate-400">Applicant: {rejectingUser.fullName}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Please use your official corporate engineering email address."
                className="w-full bg-[#0d0e15] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This reason will be visible to the user if they attempt to log in.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingUser(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                {isSubmittingAction ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161822] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Permanently Delete Account?</h3>
                <p className="text-xs text-slate-400">{deletingUser.fullName} ({deletingUser.email})</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this user? This action cannot be undone and will remove all their access.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                {isSubmittingAction ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

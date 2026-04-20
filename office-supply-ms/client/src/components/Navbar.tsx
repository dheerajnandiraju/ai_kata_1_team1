import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'rounded-lg px-3 py-2 text-sm font-semibold transition',
      isActive
        ? 'bg-emerald-100 text-emerald-900'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ');

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearAuth();
    toast.success('Logged out');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-900">
            Office Supply Hub
          </div>
          <div className="flex flex-wrap items-center gap-1">
        {user.role === 'employee' ? (
          <>
                <NavLink to="/employee/dashboard" className={navClass}>Dashboard</NavLink>
                <NavLink to="/employee/request" className={navClass}>New Request</NavLink>
                <NavLink to="/employee/history" className={navClass}>My Requests</NavLink>
          </>
        ) : (
          <>
                <NavLink to="/admin/dashboard" className={navClass}>Dashboard</NavLink>
                <NavLink to="/admin/inventory" className={navClass}>Inventory</NavLink>
                <NavLink to="/admin/pending" className={navClass}>Pending</NavLink>
                <NavLink to="/admin/requests" className={navClass}>All Requests</NavLink>
          </>
        )}
          </div>
      </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
          <span className="pill bg-slate-100 text-slate-700 capitalize">{user.role}</span>
        <button
          onClick={handleLogout}
            className="btn btn-secondary"
        >
          Logout
        </button>
        </div>
      </div>
    </nav>
  );
}

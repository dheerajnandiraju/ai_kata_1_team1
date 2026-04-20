import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface Stats {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    {
      label: 'Total Requests',
      helper: 'All requests submitted',
      value: stats?.totalRequests ?? '—',
      color: 'bg-cyan-50 text-cyan-800 border-cyan-100',
    },
    {
      label: 'Pending',
      helper: 'Waiting for admin action',
      value: stats?.pending ?? '—',
      color: 'bg-amber-50 text-amber-800 border-amber-100',
    },
    {
      label: 'Approved',
      helper: 'Cleared and fulfilled',
      value: stats?.approved ?? '—',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    },
    {
      label: 'Rejected',
      helper: 'Need a revised request',
      value: stats?.rejected ?? '—',
      color: 'bg-rose-50 text-rose-800 border-rose-100',
    },
  ];

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="page-title">Employee Dashboard</h1>
        <p className="page-subtitle">Hi {user?.name}, here is the current state of your office supply requests.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.color}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">{c.label}</p>
            <p className="mt-2 text-4xl font-extrabold leading-none">{c.value}</p>
            <p className="mt-2 text-xs opacity-80">{c.helper}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-600">Create a new request or review your request history.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to="/employee/request"
              className="btn btn-primary"
        >
          Create Request
        </Link>
        <Link
          to="/employee/history"
              className="btn btn-secondary"
        >
          View History
        </Link>
        </div>
      </div>
    </div>
  );
}

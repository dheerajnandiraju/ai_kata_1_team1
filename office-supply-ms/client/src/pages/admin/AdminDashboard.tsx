import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface Stats {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  inventoryCount: number;
  lowStockCount: number;
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    {
      label: 'Total Requests',
      helper: 'Across all users',
      value: stats?.totalRequests ?? '—',
      color: 'bg-cyan-50 text-cyan-900 border-cyan-100',
      link: '/admin/requests',
    },
    {
      label: 'Pending',
      helper: 'Awaiting review',
      value: stats?.pending ?? '—',
      color: 'bg-amber-50 text-amber-900 border-amber-100',
      link: '/admin/pending',
    },
    {
      label: 'Approved',
      helper: 'Completed requests',
      value: stats?.approved ?? '—',
      color: 'bg-emerald-50 text-emerald-900 border-emerald-100',
      link: '/admin/requests?status=approved',
    },
    {
      label: 'Rejected',
      helper: 'Declined requests',
      value: stats?.rejected ?? '—',
      color: 'bg-rose-50 text-rose-900 border-rose-100',
      link: '/admin/requests?status=rejected',
    },
    {
      label: 'Inventory Items',
      helper: 'Tracked SKUs',
      value: stats?.inventoryCount ?? '—',
      color: 'bg-teal-50 text-teal-900 border-teal-100',
      link: '/admin/inventory',
    },
    {
      label: 'Low Stock',
      helper: 'Needs replenishment',
      value: stats?.lowStockCount ?? '—',
      color: 'bg-orange-50 text-orange-900 border-orange-100',
      link: '/admin/inventory',
    },
  ];

  return (
    <div className="page-wrap">
      <div className="mb-6">
        <h1 className="page-title">Admin Command Center</h1>
        <p className="page-subtitle">Welcome, {user?.name}. Review requests, monitor stock, and act quickly.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.link} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${c.color}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">{c.label}</p>
            <p className="mt-2 text-4xl font-extrabold leading-none">{c.value}</p>
            <p className="mt-2 text-xs opacity-80">{c.helper}</p>
          </Link>
        ))}
      </div>

      {stats && stats.lowStockCount > 0 && (
        <div className="panel mt-6 border-orange-200 bg-orange-50 text-sm text-orange-900">
          <p className="font-semibold">Stock Alert</p>
          <p className="mt-1">
            <strong>{stats.lowStockCount}</strong> item(s) are below threshold.{' '}
            <Link to="/admin/inventory" className="font-semibold underline">Open inventory now</Link>
          </p>
        </div>
      )}
    </div>
  );
}

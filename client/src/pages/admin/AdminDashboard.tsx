import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, DashboardData } from '../../api/dashboard';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardApi.get()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'));
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Admin Dashboard</h1>
      <div style={styles.grid}>
        <StatCard label="Total Requests" value={data?.totalRequests ?? '—'} />
        <StatCard label="Pending" value={data?.pending ?? '—'} color="#f59e0b" />
        <StatCard label="Approved" value={data?.approved ?? '—'} color="#10b981" />
        <StatCard label="Rejected" value={data?.rejected ?? '—'} color="#ef4444" />
        <StatCard label="Inventory Items" value={data?.inventoryCount ?? '—'} color="#6366f1" />
        <StatCard label="Low Stock" value={data?.lowStockCount ?? '—'} color="#f97316" />
      </div>
      <div style={styles.actions}>
        <Link to="/admin/pending" style={{ ...styles.btn, background: '#f59e0b' }}>Pending Requests</Link>
        <Link to="/admin/requests" style={{ ...styles.btn, background: '#6366f1' }}>All Requests</Link>
        <Link to="/admin/inventory" style={{ ...styles.btn, background: '#10b981' }}>Inventory</Link>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' }}>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: color ?? '#1e293b' }}>{value}</div>
    <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{label}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' },
  heading: { marginBottom: '1.5rem', fontSize: '1.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  actions: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  btn: { padding: '0.65rem 1.25rem', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' },
};

export default AdminDashboard;

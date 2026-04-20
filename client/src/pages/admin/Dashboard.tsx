import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { getDashboard } from '../../api';
import { Link } from 'react-router-dom';

const cards = [
  { key: 'totalRequests', label: 'Total Requests', color: '#4f46e5', icon: '📋' },
  { key: 'pending', label: 'Pending', color: '#f59e0b', icon: '⏳' },
  { key: 'approved', label: 'Approved', color: '#10b981', icon: '✅' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444', icon: '❌' },
  { key: 'inventoryCount', label: 'Inventory Items', color: '#6366f1', icon: '📦' },
  { key: 'lowStockCount', label: 'Low Stock', color: '#dc2626', icon: '⚠️' },
] as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    getDashboard().then((r) => setStats(r.data));
  }, []);

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Admin Dashboard</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          {cards.map(({ key, label, color, icon }, i) => (
            <div
              key={key}
              className={`stat-card animate-fade-in-up stagger-${i + 1}`}
              style={{ '--accent-color': color } as React.CSSProperties}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
              <div className="stat-value">{stats[key] ?? '—'}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="animate-fade-in-up stagger-6">
          <Link to="/admin/pending" className="link-btn" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            ⏳ Review Pending
          </Link>
          <Link to="/admin/inventory" className="link-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            📦 Manage Inventory
          </Link>
          <Link to="/admin/requests" className="link-btn" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            📄 All Requests
          </Link>
        </div>
      </div>
    </>
  );
}

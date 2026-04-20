import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { getDashboard } from '../../api';
import { Link } from 'react-router-dom';

const cards = [
  { key: 'totalRequests', label: 'Total Requests', color: '#4f46e5', icon: '📋' },
  { key: 'pending', label: 'Pending', color: '#f59e0b', icon: '⏳' },
  { key: 'approved', label: 'Approved', color: '#10b981', icon: '✅' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444', icon: '❌' },
] as const;

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    getDashboard().then((r) => setStats(r.data));
  }, []);

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Employee Dashboard</h1>

        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: 12 }} className="animate-fade-in-up stagger-5">
          <Link to="/employee/new-request" className="link-btn" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            ＋ New Request
          </Link>
          <Link to="/employee/my-requests" className="link-btn" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            📄 My Requests
          </Link>
        </div>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { ClipboardList, Clock, CheckCircle2, XCircle, PackagePlus, TrendingUp } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

interface Stats { totalRequests: number; pending: number; approved: number; rejected: number; }

export default function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    dashboardApi.get().then((r) => setStats(r.data as Stats)).catch(console.error);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={h1Style}>Welcome back, {user?.name} 👋</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Track your supply requests and manage submissions.</p>
        </div>
        <Link to="/requests/new" style={newReqBtnStyle}>
          <PackagePlus size={18} /><span>New Request</span>
        </Link>
      </div>

      {stats ? (
        <div style={gridStyle}>
          <StatCard icon={<ClipboardList size={22} />} label="Total Requests" value={stats.totalRequests} color="var(--primary-500)" bg="var(--info-bg)" />
          <StatCard icon={<Clock size={22} />} label="Pending" value={stats.pending} color="var(--warning)" bg="var(--warning-bg)" />
          <StatCard icon={<CheckCircle2 size={22} />} label="Approved" value={stats.approved} color="var(--success)" bg="var(--success-bg)" />
          <StatCard icon={<XCircle size={22} />} label="Rejected" value={stats.rejected} color="var(--danger)" bg="var(--danger-bg)" />
        </div>
      ) : (
        <div style={gridStyle}>
          {[...Array(4)].map((_, i) => <div key={i} style={skeletonStyle} />)}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: {
  icon: ReactNode; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      padding: '24px', boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-light)',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>{icon}</div>
        <TrendingUp size={16} color="var(--text-light)" />
      </div>
      <div>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  );
}

const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' };
const newReqBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '10px 20px', borderRadius: 'var(--radius-md)',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff', fontWeight: 600, fontSize: '0.88rem',
  boxShadow: '0 4px 14px rgba(76, 110, 245, 0.3)',
  textDecoration: 'none',
};
const skeletonStyle: CSSProperties = {
  height: 140, borderRadius: 'var(--radius-lg)', background: 'var(--border-light)',
};

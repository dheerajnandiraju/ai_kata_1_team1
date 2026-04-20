import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../store/authStore';
import { ClipboardList, Clock, CheckCircle2, XCircle, Warehouse, AlertTriangle, TrendingUp } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

interface Stats { totalRequests: number; pending: number; approved: number; rejected: number; inventoryCount: number; lowStockCount: number; }

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    dashboardApi.get().then((r) => setStats(r.data as Stats)).catch(console.error);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={h1Style}>Good {getGreeting()}, {user?.name} 👋</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Here's an overview of your office supply operations.</p>
      </div>

      {stats ? (
        <>
          {/* Stat cards */}
          <div style={gridStyle}>
            <StatCard icon={<ClipboardList size={22} />} label="Total Requests" value={stats.totalRequests} color="var(--primary-500)" bg="var(--info-bg)" />
            <StatCard icon={<Clock size={22} />} label="Pending" value={stats.pending} color="var(--warning)" bg="var(--warning-bg)" />
            <StatCard icon={<CheckCircle2 size={22} />} label="Approved" value={stats.approved} color="var(--success)" bg="var(--success-bg)" />
            <StatCard icon={<XCircle size={22} />} label="Rejected" value={stats.rejected} color="var(--danger)" bg="var(--danger-bg)" />
            <StatCard icon={<Warehouse size={22} />} label="Inventory Items" value={stats.inventoryCount} color="#7c3aed" bg="#f5f3ff" />
            <StatCard icon={<AlertTriangle size={22} />} label="Low Stock Items" value={stats.lowStockCount} color="#dc2626" bg="#fef2f2" accent />
          </div>

          {/* Quick insight */}
          {stats.lowStockCount > 0 && (
            <div style={alertBoxStyle}>
              <AlertTriangle size={18} color="var(--warning)" />
              <span><strong>{stats.lowStockCount} item{stats.lowStockCount > 1 ? 's' : ''}</strong> running low on stock. Consider restocking soon.</span>
            </div>
          )}
        </>
      ) : (
        <div style={skeletonGridStyle}>
          {[...Array(6)].map((_, i) => <div key={i} style={skeletonCardStyle} />)}
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function StatCard({ icon, label, value, color, bg, accent }: {
  icon: ReactNode; label: string; value: number; color: string; bg: string; accent?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      padding: '24px', boxShadow: 'var(--shadow-sm)',
      border: accent ? `1.5px solid ${color}30` : '1px solid var(--border-light)',
      display: 'flex', flexDirection: 'column', gap: '14px',
      transition: 'var(--transition)',
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

/* ─── Styles ──────────────────────────────────────────────── */
const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px', marginBottom: '24px' };
const alertBoxStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '14px 18px', borderRadius: 'var(--radius-md)',
  background: 'var(--warning-bg)', border: '1px solid var(--warning)20',
  fontSize: '0.88rem', color: 'var(--warning-text)',
};
const skeletonGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' };
const skeletonCardStyle: CSSProperties = {
  height: 140, borderRadius: 'var(--radius-lg)', background: 'var(--border-light)',
  animation: 'pulse 1.5s ease-in-out infinite',
};

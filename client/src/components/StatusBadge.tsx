import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

const config: Record<string, { bg: string; color: string; border: string; icon: ReactNode }> = {
  pending:  { bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning)', icon: <Clock size={13} /> },
  approved: { bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success)', icon: <CheckCircle2 size={13} /> },
  rejected: { bg: 'var(--danger-bg)',  color: 'var(--danger-text)',  border: 'var(--danger)',  icon: <XCircle size={13} /> },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = config[status] ?? { bg: '#f3f4f6', color: '#374151', border: '#d1d5db', icon: null };
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px 3px 8px', borderRadius: '999px',
    fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4,
    background: s.bg, color: s.color,
    border: `1px solid ${s.border}20`,
    textTransform: 'capitalize',
  };
  return <span style={style}>{s.icon}{status}</span>;
}

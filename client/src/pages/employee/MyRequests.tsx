import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestsApi } from '../../api/requests';
import StatusBadge from '../../components/StatusBadge';
import { ClipboardList, PackagePlus, Calendar, Inbox } from 'lucide-react';
import type { CSSProperties } from 'react';

interface Request { _id: string; itemName: string; quantity: number; status: string; remarks?: string; createdAt: string; }

export default function MyRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestsApi.mine().then((r) => {
      const data = r.data as { requests: Request[]; total: number };
      setRequests(data.requests);
      setTotal(data.total);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[...Array(3)].map((_, i) => <div key={i} style={skeletonStyle} />)}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={h1Style}>My Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{total} request{total !== 1 ? 's' : ''} submitted</p>
        </div>
        <Link to="/requests/new" style={newBtnStyle}>
          <PackagePlus size={17} /> New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div style={emptyStyle}>
          <Inbox size={48} color="var(--text-light)" />
          <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: '12px' }}>No requests yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>Submit your first supply request to get started.</p>
          <Link to="/requests/new" style={newBtnStyle}>
            <PackagePlus size={17} /> Create Request
          </Link>
        </div>
      ) : (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Remarks</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} style={trStyle}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={itemIconStyle}><ClipboardList size={15} color="var(--primary-500)" /></div>
                      <span style={{ fontWeight: 500 }}>{r.itemName}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.quantity}</span></td>
                  <td style={tdStyle}><StatusBadge status={r.status} /></td>
                  <td style={tdStyle}><span style={{ color: r.remarks ? 'var(--text)' : 'var(--text-light)' }}>{r.remarks ?? '—'}</span></td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <Calendar size={13} /> {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' };
const newBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '8px',
  padding: '10px 20px', borderRadius: 'var(--radius-md)',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff', fontWeight: 600, fontSize: '0.85rem',
  boxShadow: '0 4px 14px rgba(76,110,245,0.3)', textDecoration: 'none',
};
const tableContainerStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
};
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = {
  padding: '14px 20px', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem',
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
  background: 'var(--surface-dim)', borderBottom: '1px solid var(--border-light)',
};
const trStyle: CSSProperties = { borderBottom: '1px solid var(--border-light)' };
const tdStyle: CSSProperties = { padding: '14px 20px', fontSize: '0.88rem', verticalAlign: 'middle' };
const itemIconStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
  background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const emptyStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '4rem 2rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  border: '1px dashed var(--border)',
};
const skeletonStyle: CSSProperties = {
  height: 72, borderRadius: 'var(--radius-lg)', background: 'var(--border-light)',
};

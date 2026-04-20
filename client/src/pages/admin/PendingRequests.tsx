import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { requestsApi } from '../../api/requests';
import { CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare, Inbox } from 'lucide-react';
import type { CSSProperties } from 'react';

interface Req { _id: string; itemName: string; quantity: number; remarks?: string; requestedBy: { name: string; email: string }; createdAt: string; }

export default function PendingRequests() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    const r = await requestsApi.pending();
    const d = r.data as { requests: Req[]; total: number };
    setRequests(d.requests);
    setTotal(d.total);
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function handleApprove(id: string) {
    try {
      await requestsApi.approve(id);
      toast.success('Request approved');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Error');
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason (optional):') ?? undefined;
    try {
      await requestsApi.reject(id, reason);
      toast.success('Request rejected');
      load();
    } catch { toast.error('Error'); }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={h1Style}>Pending Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{total} request{total !== 1 ? 's' : ''} waiting for review</p>
        </div>
        <div style={countBadgeStyle}>
          <Clock size={16} /> {total}
        </div>
      </div>

      {requests.length === 0 ? (
        <div style={emptyStyle}>
          <Inbox size={48} color="var(--text-light)" />
          <p style={{ fontWeight: 600, color: 'var(--text)', marginTop: '12px' }}>All caught up!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No pending requests at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((r) => (
            <div key={r._id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={itemBadgeStyle}>{r.itemName}</span>
                    <span style={qtyTagStyle}>x{r.quantity}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span style={metaStyle}><User size={13} /> {r.requestedBy.name}</span>
                    <span style={metaStyle}><Calendar size={13} /> {new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.remarks && <span style={metaStyle}><MessageSquare size={13} /> {r.remarks}</span>}
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button onClick={() => handleApprove(r._id)} style={approveBtnStyle}>
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button onClick={() => handleReject(r._id)} style={rejectBtnStyle}>
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' };
const countBadgeStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: 'var(--radius-md)',
  background: 'var(--warning-bg)', color: 'var(--warning-text)',
  fontWeight: 700, fontSize: '0.9rem',
};
const cardStyle: CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  padding: '20px 24px', border: '1px solid var(--border-light)',
  boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
};
const itemBadgeStyle: CSSProperties = {
  fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)',
};
const qtyTagStyle: CSSProperties = {
  padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
  background: 'var(--primary-50)', color: 'var(--primary-600)',
};
const metaStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '4px' };
const approveBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
  background: 'var(--success-bg)', color: 'var(--success-text)',
  border: '1px solid var(--success)30', fontWeight: 600, fontSize: '0.84rem',
  cursor: 'pointer', transition: 'var(--transition)',
};
const rejectBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
  background: 'var(--danger-bg)', color: 'var(--danger-text)',
  border: '1px solid var(--danger)30', fontWeight: 600, fontSize: '0.84rem',
  cursor: 'pointer', transition: 'var(--transition)',
};
const emptyStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '4rem 2rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
  border: '1px dashed var(--border)',
};

import { useEffect, useState } from 'react';
import { requestsApi } from '../../api/requests';
import StatusBadge from '../../components/StatusBadge';
import { Search, Filter, User, Calendar } from 'lucide-react';
import type { CSSProperties } from 'react';

interface Req { _id: string; itemName: string; quantity: number; status: string; requestedBy: { name: string; email: string }; actionedBy?: { name: string }; createdAt: string; rejectionReason?: string; }

export default function AllRequests() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    requestsApi.all({ search: search || undefined, status: status || undefined })
      .then((r) => {
        const d = r.data as { requests: Req[]; total: number };
        setRequests(d.requests);
        setTotal(d.total);
      }).catch(console.error);
  }, [search, status]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={h1Style}>All Requests</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{total} total request{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={searchWrapStyle}>
          <Search size={17} color="var(--text-light)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item…" style={searchInputStyle} />
        </div>
        <div style={selectWrapStyle}>
          <Filter size={16} color="var(--text-light)" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Employee</th>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actioned By</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r._id} style={trStyle}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={avatarSmStyle}><User size={13} color="var(--primary-500)" /></div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{r.requestedBy.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{r.requestedBy.email}</div>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}><span style={{ fontWeight: 500 }}>{r.itemName}</span></td>
                <td style={tdStyle}><span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.quantity}</span></td>
                <td style={tdStyle}>
                  <StatusBadge status={r.status} />
                  {r.rejectionReason && <div style={{ color: 'var(--text-light)', fontSize: '0.73rem', marginTop: '4px' }}>{r.rejectionReason}</div>}
                </td>
                <td style={tdStyle}>{r.actionedBy?.name ?? <span style={{ color: 'var(--text-light)' }}>—</span>}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <Calendar size={13} /> {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                No requests found matching your criteria.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */
const h1Style: CSSProperties = { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' };
const searchWrapStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface)', flex: 1, maxWidth: 320,
};
const searchInputStyle: CSSProperties = {
  flex: 1, padding: '10px 0', border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.88rem',
};
const selectWrapStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface)',
};
const selectStyle: CSSProperties = {
  padding: '10px 0', border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.88rem', color: 'var(--text)',
  cursor: 'pointer',
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
const avatarSmStyle: CSSProperties = {
  width: 30, height: 30, borderRadius: '50%',
  background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

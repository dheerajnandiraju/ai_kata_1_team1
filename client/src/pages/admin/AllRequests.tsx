import React, { useEffect, useState } from 'react';
import { requestsApi, SupplyRequest } from '../../api/requests';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

const AllRequests: React.FC = () => {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = async (p = 1) => {
    try {
      const res = await requestsApi.all({ page: p, limit: PAGE_SIZE, search: search || undefined, status: status || undefined });
      setRequests(res.data.requests);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      toast.error('Failed to load requests');
    }
  };

  useEffect(() => { load(1); }, [search, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>All Requests ({total})</h1>
      <div style={styles.filters}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item…" style={styles.input} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>Item</th>
            <th style={styles.th}>Qty</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actioned By</th>
            <th style={styles.th}>Date</th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No requests found.</td></tr>
          )}
          {requests.map((r) => (
            <tr key={r._id} style={styles.row}>
              <td style={styles.td}>{r.requestedBy.name}</td>
              <td style={styles.td}>{r.itemName}</td>
              <td style={styles.td}>{r.quantity}</td>
              <td style={styles.td}><StatusBadge status={r.status} /></td>
              <td style={styles.td}>{r.actionedBy?.name ?? '—'}</td>
              <td style={styles.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button disabled={page <= 1} onClick={() => load(page - 1)} style={styles.pageBtn}>Previous</button>
          <span style={{ padding: '0 1rem' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} style={styles.pageBtn}>Next</button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' },
  heading: { marginBottom: '1rem', fontSize: '1.5rem' },
  filters: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  input: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  headerRow: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' },
  row: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.75rem 1rem', fontSize: '0.9rem' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' },
};

export default AllRequests;

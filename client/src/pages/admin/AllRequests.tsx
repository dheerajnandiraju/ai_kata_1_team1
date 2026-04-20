import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { getAllRequests } from '../../api';

interface Request {
  _id: string;
  itemName: string;
  quantity: number;
  remarks?: string;
  status: string;
  rejectionReason?: string;
  requestedBy: { name: string; email: string };
  actionedBy?: { name: string };
  createdAt: string;
}

export default function AllRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllRequests(statusFilter ? { status: statusFilter } : {})
      .then((r) => { setRequests(r.data.requests); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <>
      <Navbar />
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>All Requests <span style={{ fontSize: '1rem', fontWeight: 400, color: '#64748b' }}>({total})</span></h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                {['Requester', 'Item', 'Qty', 'Status', 'Actioned By', 'Reason', 'Date'].map((h) => <th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r._id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.requestedBy.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.requestedBy.email}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.itemName}</td>
                    <td style={{ fontWeight: 600 }}>{r.quantity}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: '#64748b' }}>{r.actionedBy?.name || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{r.rejectionReason || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={7} className="table-empty">No requests found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

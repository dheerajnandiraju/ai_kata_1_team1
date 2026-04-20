import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { getPendingRequests, approveRequest, rejectRequest } from '../../api';
import toast from 'react-hot-toast';

interface Request {
  _id: string;
  itemName: string;
  quantity: number;
  remarks?: string;
  requestedBy: { name: string; email: string };
  createdAt: string;
}

export default function PendingRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => getPendingRequests().then((r) => { setRequests(r.data.requests); setTotal(r.data.total); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await approveRequest(id);
      toast.success('Request approved');
      load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Approval failed';
      toast.error(message);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await rejectRequest(rejectId, reason);
    toast.success('Request rejected');
    setRejectId(null); setReason('');
    load();
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Pending Requests <span style={{ fontSize: '1rem', fontWeight: 400, color: '#64748b' }}>({total})</span></h1>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                {['Requester', 'Item', 'Qty', 'Remarks', 'Status', 'Date', 'Actions'].map((h) => <th key={h}>{h}</th>)}
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
                    <td style={{ color: '#64748b' }}>{r.remarks || '—'}</td>
                    <td><StatusBadge status="pending" /></td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleApprove(r._id)} className="btn btn-success btn-sm">✓ Approve</button>
                        <button onClick={() => setRejectId(r._id)} className="btn btn-danger btn-sm">✗ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && <tr><td colSpan={7} className="table-empty">No pending requests — all caught up! 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Reject modal */}
        {rejectId && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>❌ Reject Request</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 16 }}>Optionally provide a reason for rejection.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional)…"
                className="input"
                style={{ height: 90, resize: 'vertical', marginBottom: 20 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleReject} className="btn btn-danger" style={{ flex: 1 }}>Confirm Reject</button>
                <button onClick={() => setRejectId(null)} className="btn btn-ghost" style={{ flex: 1, border: '1.5px solid #e2e8f0' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

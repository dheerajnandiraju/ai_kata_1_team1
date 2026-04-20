import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import StatusBadge from '../../components/StatusBadge';
import { getMyRequests } from '../../api';

interface Request {
  _id: string;
  itemName: string;
  quantity: number;
  remarks?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function MyRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests()
      .then((r) => { setRequests(r.data.requests); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>My Requests <span style={{ fontSize: '1rem', fontWeight: 400, color: '#64748b' }}>({total})</span></h1>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {['Item', 'Qty', 'Remarks', 'Status', 'Reason', 'Date'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r._id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                    <td style={{ fontWeight: 500 }}>{r.itemName}</td>
                    <td>{r.quantity}</td>
                    <td style={{ color: '#64748b' }}>{r.remarks || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{r.rejectionReason || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={6} className="table-empty">No requests yet — submit your first one!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface SupplyRequest {
  _id: string;
  requestedBy: { name: string; email: string };
  itemName: string;
  quantity: number;
  remarks?: string;
  status: string;
  createdAt: string;
}

export default function PendingRequests() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isGeneratingReason, setIsGeneratingReason] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests/pending', {
        params: {
          page,
          limit,
        },
      });
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/requests/${id}/approve`);
      toast.success('Request approved');
      fetchPending();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/requests/${id}/reject`, { reason: rejectReason || undefined });
      toast.success('Request rejected');
      setRejectId(null);
      setRejectReason('');
      fetchPending();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleAiReason = async (request: SupplyRequest) => {
    setIsGeneratingReason(true);
    try {
      const response = await api.post('/ai/request-assist', {
        mode: 'rejection-reason',
        itemName: request.itemName,
        quantity: request.quantity,
        remarks: request.remarks || undefined,
      });

      const suggestion = String(response.data?.suggestion || '').trim();
      if (!suggestion) {
        toast.error('AI returned an empty rejection reason');
        return;
      }

      setRejectReason(suggestion);
      toast.success('AI rejection reason generated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate AI rejection reason');
    } finally {
      setIsGeneratingReason(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="mb-4">
        <h1 className="page-title">Pending Requests</h1>
        <p className="page-subtitle">Review incoming requests and approve or reject with an optional reason.</p>
      </div>

      {loading ? (
        <div className="panel text-sm text-slate-500">Loading pending queue…</div>
      ) : requests.length === 0 ? (
        <div className="panel text-center text-slate-500">No pending requests right now.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id} className="panel flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{r.itemName} × {r.quantity}</p>
                  <p className="text-xs text-slate-500">By {r.requestedBy.name} ({r.requestedBy.email})</p>
                  {r.remarks && <p className="mt-1 text-sm text-slate-600">"{r.remarks}"</p>}
                </div>
                <span className="pill bg-slate-100 text-slate-600">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>

              {rejectId === r._id ? (
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1"
                    placeholder="Rejection reason (optional)"
                  />
                  <button
                    onClick={() => handleAiReason(r)}
                    disabled={isGeneratingReason}
                    className="btn btn-secondary"
                  >
                    {isGeneratingReason ? 'Generating...' : 'AI Reason'}
                  </button>
                  <button onClick={() => handleReject(r._id)} className="btn btn-danger">Confirm Reject</button>
                  <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="btn btn-secondary">Cancel</button>
                </div>
              ) : (
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleApprove(r._id)}
                    className="btn btn-success"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectId(r._id)}
                    className="btn btn-secondary"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600">
            <p>{total} pending total</p>
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className="w-auto rounded-lg border border-slate-200 bg-white px-2 py-1"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

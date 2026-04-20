import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';

interface SupplyRequest {
  _id: string;
  requestedBy: { name: string; email: string };
  itemName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  actionedBy?: { name: string };
  actionedAt?: string;
  createdAt: string;
}

export default function AllRequests() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      params.page = String(page);
      params.limit = String(limit);
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/requests', { params });
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, fromDate, toDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const onSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const onStatusChange = (value: string) => {
    setPage(1);
    setStatusFilter(value);
  };

  const onFromDateChange = (value: string) => {
    setPage(1);
    setFromDate(value);
  };

  const onToDateChange = (value: string) => {
    setPage(1);
    setToDate(value);
  };

  const onLimitChange = (value: string) => {
    setPage(1);
    setLimit(Number(value));
  };

  return (
    <div className="page-wrap">
      <div className="mb-4">
        <h1 className="page-title">All Requests</h1>
        <p className="page-subtitle">Analyze request trends with filters for status, search, and date range.</p>
      </div>

      <div className="panel mb-4">
        <div className="grid gap-3 md:grid-cols-5">
        <input
            className="md:col-span-2"
          placeholder="Search by item name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
            className="w-full"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
        />
        </div>
      </div>

      {loading ? (
        <div className="panel text-sm text-slate-500">Loading request history…</div>
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actioned By</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{r.requestedBy.name}</p>
                      <p className="text-xs text-slate-500">{r.requestedBy.email}</p>
                  </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.itemName}</td>
                    <td className="px-4 py-3 text-slate-700">{r.quantity}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{r.actionedBy?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.rejectionReason || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <p>{total} total</p>
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(e.target.value)}
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

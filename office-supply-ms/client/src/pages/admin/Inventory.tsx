import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface InventoryItem {
  _id: string;
  name: string;
  quantity: number;
  lowStock: boolean;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [adding, setAdding] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      params.page = String(page);
      params.limit = String(limit);
      if (search) params.search = search;
      const res = await api.get('/inventory', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error('Item name required'); return; }
    try {
      await api.post('/inventory', { name: newName.trim(), quantity: newQty });
      toast.success('Item added');
      setNewName(''); setNewQty(0); setAdding(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await api.patch(`/inventory/${id}`, { quantity: editQty });
      toast.success('Quantity updated');
      setEditId(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      toast.success('Item deleted');
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="page-wrap">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage stock levels, add new items, and monitor low-stock status.</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="btn btn-primary"
        >
          {adding ? 'Close Form' : 'Add Item'}
        </button>
      </div>

      {adding && (
        <div className="panel mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_130px_auto_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Item Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Stapler"
            />
          </div>
          <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Quantity</label>
            <input
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(Number(e.target.value))}
            />
          </div>
            <button onClick={handleAdd} className="btn btn-success">Save</button>
            <button onClick={() => setAdding(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="panel mb-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Search</label>
        <input
          className="max-w-sm"
          placeholder="Search items…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      {loading ? (
        <div className="panel text-sm text-slate-500">Loading inventory…</div>
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Quantity</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3">
                    {editId === item._id ? (
                      <input
                        type="number"
                        min={0}
                        value={editQty}
                        onChange={(e) => setEditQty(Number(e.target.value))}
                          className="w-24"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.lowStock ? (
                        <span className="pill bg-orange-100 text-orange-800">Low Stock</span>
                    ) : (
                        <span className="pill bg-emerald-100 text-emerald-800">In Stock</span>
                    )}
                  </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                    {editId === item._id ? (
                      <>
                            <button onClick={() => handleUpdate(item._id)} className="btn btn-success px-3 py-1.5 text-xs">Save</button>
                            <button onClick={() => setEditId(null)} className="btn btn-secondary px-3 py-1.5 text-xs">Cancel</button>
                      </>
                    ) : (
                      <>
                            <button onClick={() => { setEditId(item._id); setEditQty(item.quantity); }} className="btn btn-secondary px-3 py-1.5 text-xs">Edit</button>
                            <button onClick={() => handleDelete(item._id)} className="btn btn-danger px-3 py-1.5 text-xs">Delete</button>
                      </>
                    )}
                      </div>
                  </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <p>{total} items</p>
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

import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../../api';
import toast from 'react-hot-toast';

interface Item { _id: string; name: string; quantity: number; lowStock: boolean; }

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => getInventory().then((r) => { setItems(r.data.items); setTotal(r.data.total); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName) return;
    await createInventoryItem(newName, newQty);
    toast.success('Item added');
    setNewName(''); setNewQty(0);
    load();
  };

  const handleUpdate = async (id: string) => {
    await updateInventoryItem(id, editQty);
    toast.success('Updated');
    setEditId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await deleteInventoryItem(id);
    toast.success('Deleted');
    load();
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <h1>Inventory <span style={{ fontSize: '1rem', fontWeight: 400, color: '#64748b' }}>({total})</span></h1>

        {/* Add new item form */}
        <div className="card animate-fade-in-up" style={{ marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-end', padding: 20 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Item Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name" className="input" />
          </div>
          <div style={{ width: 120 }}>
            <label className="label">Quantity</label>
            <input value={newQty} onChange={(e) => setNewQty(+e.target.value)} type="number" min={0} className="input" />
          </div>
          <button onClick={handleCreate} className="btn btn-primary" style={{ height: 42 }}>＋ Add</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                {['Name', 'Quantity', 'Status', 'Actions'].map((h) => <th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item._id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                    <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{item.name}</td>
                    <td>
                      {editId === item._id
                        ? <input value={editQty} onChange={(e) => setEditQty(+e.target.value)} type="number" min={0} className="input" style={{ width: 90 }} />
                        : <span style={{ fontWeight: 600 }}>{item.quantity}</span>}
                    </td>
                    <td>
                      {item.lowStock
                        ? <span className="animate-scale-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            Low Stock
                          </span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                            OK
                          </span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editId === item._id
                          ? <>
                              <button onClick={() => handleUpdate(item._id)} className="btn btn-success btn-sm">Save</button>
                              <button onClick={() => setEditId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                            </>
                          : <>
                              <button onClick={() => { setEditId(item._id); setEditQty(item.quantity); }} className="btn btn-primary btn-sm">Edit</button>
                              <button onClick={() => handleDelete(item._id)} className="btn btn-danger btn-sm">Delete</button>
                            </>}
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={4} className="table-empty">No inventory items yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

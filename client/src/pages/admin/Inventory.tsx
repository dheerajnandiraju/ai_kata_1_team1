import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inventoryApi } from '../../api/inventory';
import {
  Plus, Search, Pencil, Trash2, Save, X, AlertTriangle, CheckCircle2, Warehouse
} from 'lucide-react';
import type { CSSProperties } from 'react';

interface Item { _id: string; name: string; quantity: number; lowStock: boolean; }

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const r = await inventoryApi.list({ search: search || undefined });
    const d = r.data as { items: Item[]; total: number };
    setItems(d.items);
    setTotal(d.total);
  }

  useEffect(() => { load().catch(console.error); }, [search]);

  async function handleCreate() {
    if (!newName.trim()) return toast.error('Name required');
    try {
      await inventoryApi.create({ name: newName.trim(), quantity: newQty });
      toast.success('Item created');
      setNewName(''); setNewQty(0); setShowAdd(false);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Error');
    }
  }

  async function handleUpdate(id: string) {
    try {
      await inventoryApi.update(id, editQty);
      toast.success('Updated');
      setEditId(null);
      load();
    } catch { toast.error('Error'); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return;
    try {
      await inventoryApi.remove(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Error'); }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={h1Style}>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{total} item{total !== 1 ? 's' : ''} in stock</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={primaryBtnStyle}>
          <Plus size={17} /><span>Add Item</span>
        </button>
      </div>

      {/* Add item panel */}
      {showAdd && (
        <div style={addPanelStyle}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', flex: 1 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle}>Item Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} style={fieldStyle} placeholder="e.g. A4 Paper" />
            </div>
            <div style={{ width: 120 }}>
              <label style={labelStyle}>Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(+e.target.value)} min={0} style={fieldStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCreate} style={primaryBtnStyle}><Plus size={16} /> Create</button>
              <button onClick={() => setShowAdd(false)} style={ghostBtnStyle}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={searchWrapStyle}>
        <Search size={17} color="var(--text-light)" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" style={searchInputStyle} />
      </div>

      {/* Table */}
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Stock Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} style={trStyle}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={itemIconStyle}><Warehouse size={15} color="var(--primary-500)" /></div>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                  </div>
                </td>
                <td style={tdStyle}>
                  {editId === item._id ? (
                    <input type="number" value={editQty} onChange={(e) => setEditQty(+e.target.value)}
                      style={{ ...fieldStyle, width: 80, margin: 0, padding: '6px 10px' }} />
                  ) : (
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {item.lowStock ? (
                    <span style={lowBadgeStyle}><AlertTriangle size={13} /> Low Stock</span>
                  ) : (
                    <span style={okBadgeStyle}><CheckCircle2 size={13} /> In Stock</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {editId === item._id ? (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleUpdate(item._id)} style={iconBtnStyle} title="Save"><Save size={15} color="var(--success)" /></button>
                      <button onClick={() => setEditId(null)} style={iconBtnStyle} title="Cancel"><X size={15} color="var(--text-muted)" /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditId(item._id); setEditQty(item.quantity); }} style={iconBtnStyle} title="Edit">
                        <Pencil size={15} color="var(--primary-500)" />
                      </button>
                      <button onClick={() => handleDelete(item._id)} style={iconBtnStyle} title="Delete">
                        <Trash2 size={15} color="var(--danger)" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                No items found. Add your first inventory item above.
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
const labelStyle: CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' };
const fieldStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', background: 'var(--surface)',
  outline: 'none', transition: 'var(--transition)',
};
const primaryBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '9px 18px', borderRadius: 'var(--radius-sm)',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem',
  boxShadow: '0 2px 8px rgba(76,110,245,0.25)',
};
const ghostBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '9px',
  borderRadius: 'var(--radius-sm)', background: 'var(--surface-dim)',
  border: '1px solid var(--border)', color: 'var(--text-muted)',
};
const addPanelStyle: CSSProperties = {
  background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', marginBottom: '1.25rem',
};
const searchWrapStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', background: 'var(--surface)',
  marginBottom: '1.25rem', width: '320px',
};
const searchInputStyle: CSSProperties = {
  flex: 1, padding: '10px 0', border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.88rem',
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
const itemIconStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
  background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const lowBadgeStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
  background: 'var(--danger-bg)', color: 'var(--danger-text)',
};
const okBadgeStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
  background: 'var(--success-bg)', color: 'var(--success-text)',
};
const iconBtnStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 'var(--radius-sm)',
  background: 'var(--surface-dim)', border: '1px solid var(--border-light)',
  cursor: 'pointer', transition: 'var(--transition)',
};

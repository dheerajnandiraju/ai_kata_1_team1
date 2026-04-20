import React, { useEffect, useState } from 'react';
import { inventoryApi, InventoryItem } from '../../api/inventory';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  quantity: z.coerce.number().int().min(0, 'Must be ≥ 0'),
});
type FormData = z.infer<typeof schema>;

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = async (p = 1) => {
    try {
      const res = await inventoryApi.list({ page: p, limit: PAGE_SIZE, search: search || undefined });
      setItems(res.data.items);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      toast.error('Failed to load inventory');
    }
  };

  useEffect(() => { load(1); }, [search]);

  const openCreate = () => { setEditItem(null); reset({ name: '', quantity: 0 }); setShowForm(true); };
  const openEdit = (item: InventoryItem) => { setEditItem(item); reset({ name: item.name, quantity: item.quantity }); setShowForm(true); };

  const onSubmit = async (data: FormData) => {
    try {
      if (editItem) {
        await inventoryApi.update(editItem._id, { quantity: data.quantity });
        toast.success('Item updated');
      } else {
        await inventoryApi.create(data);
        toast.success('Item created');
      }
      setShowForm(false);
      load(1);
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await inventoryApi.delete(id);
      toast.success('Item deleted');
      load(page);
    } catch {
      toast.error('Delete failed');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.heading}>Inventory</h1>
        <button onClick={openCreate} style={styles.addBtn}>+ Add Item</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} style={styles.formCard}>
          <h3 style={{ marginBottom: '0.75rem' }}>{editItem ? 'Edit Item' : 'New Item'}</h3>
          <label style={styles.label}>Name</label>
          <input {...register('name')} disabled={!!editItem} style={styles.input} placeholder="Item name" />
          {errors.name && <span style={styles.error}>{errors.name.message}</span>}
          <label style={styles.label}>Quantity</label>
          <input {...register('quantity')} type="number" min={0} style={styles.input} />
          {errors.quantity && <span style={styles.error}>{errors.quantity.message}</span>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={isSubmitting} style={styles.saveBtn}>Save</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" style={{ ...styles.input, marginBottom: '1rem', maxWidth: '300px' }} />

      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Quantity</th>
            <th style={styles.th}>Low Stock</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No items found.</td></tr>
          )}
          {items.map((item) => (
            <tr key={item._id} style={styles.row}>
              <td style={styles.td}>{item.name}</td>
              <td style={styles.td}>{item.quantity}</td>
              <td style={styles.td}>{item.lowStock ? <span style={{ color: '#ef4444', fontWeight: 600 }}>Yes</span> : 'No'}</td>
              <td style={styles.td}>
                <button onClick={() => openEdit(item)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(item._id)} style={styles.delBtn}>Delete</button>
              </td>
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
  page: { maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  heading: { fontSize: '1.5rem' },
  addBtn: { padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' },
  formCard: { background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '400px' },
  label: { fontWeight: 600, fontSize: '0.875rem' },
  input: { padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem' },
  error: { color: '#ef4444', fontSize: '0.75rem' },
  saveBtn: { padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '0.5rem 1rem', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  headerRow: { background: '#f8fafc' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' },
  row: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.75rem 1rem', fontSize: '0.9rem' },
  editBtn: { marginRight: '0.5rem', padding: '0.25rem 0.75rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  delBtn: { padding: '0.25rem 0.75rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' },
  pageBtn: { padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' },
};

export default Inventory;

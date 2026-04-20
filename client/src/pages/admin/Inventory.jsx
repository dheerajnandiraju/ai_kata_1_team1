import { useState, useEffect } from 'react';
import api from '../../api/axios';
import './Inventory.css';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ itemName: '', quantity: 0, description: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ itemName: '', quantity: 0, description: '' });
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/inventory', {
        itemName: form.itemName,
        quantity: Number(form.quantity),
        description: form.description,
      });
      setForm({ itemName: '', quantity: 0, description: '' });
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item');
    }
  };

  const startEdit = (item) => {
    setEditId(item._id);
    setEditForm({ itemName: item.itemName, quantity: item.quantity, description: item.description });
  };

  const handleUpdate = async (id) => {
    setError('');
    try {
      await api.put(`/inventory/${id}`, {
        itemName: editForm.itemName,
        quantity: Number(editForm.quantity),
        description: editForm.description,
      });
      setEditId(null);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="inventory-page">
      <h2>Inventory Management</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="add-item-form">
        <h3>Add New Item</h3>
        <form onSubmit={handleAdd} className="inline-form">
          <input
            type="text"
            placeholder="Item Name"
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            min="0"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Quantity</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              {editId === item._id ? (
                <>
                  <td>
                    <input
                      value={editForm.itemName}
                      onChange={(e) => setEditForm({ ...editForm, itemName: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-approve" onClick={() => handleUpdate(item._id)}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td>{item.itemName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.description || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn-reject" onClick={() => handleDelete(item._id)}>Delete</button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Inventory;

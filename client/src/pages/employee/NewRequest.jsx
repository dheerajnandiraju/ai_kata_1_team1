import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './NewRequest.css';

const NewRequest = () => {
  const [form, setForm] = useState({ itemName: '', quantity: 1, remarks: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/requests', {
        itemName: form.itemName,
        quantity: Number(form.quantity),
        remarks: form.remarks,
      });
      setSuccess('Request submitted successfully!');
      setTimeout(() => navigate('/employee/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    }
  };

  return (
    <div className="new-request-container">
      <div className="new-request-card">
        <h2>New Supply Request</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              name="itemName"
              value={form.itemName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
          <div className="form-group">
            <label>Remarks (optional)</label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              rows="3"
            />
          </div>
          <button type="submit" className="btn-primary">Submit Request</button>
        </form>
      </div>
    </div>
  );
};

export default NewRequest;

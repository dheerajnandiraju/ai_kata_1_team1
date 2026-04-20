import { useState, useEffect } from 'react';
import api from '../../api/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = async () => {
    try {
      const url = filter === 'all' ? '/requests' : `/requests?status=${filter}`;
      const res = await api.get(url);
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [filter]);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/requests/${id}/approve`);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/requests/${id}/reject`, { rejectionReason: rejectReason });
      setRejectId(null);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-approved';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h2>Supply Requests</h2>
      <div className="filter-tabs">
        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {requests.length === 0 ? (
        <p className="empty-state">No requests found.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Remarks</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.employeeId?.name || 'N/A'}</td>
                <td>{req.itemName}</td>
                <td>{req.quantity}</td>
                <td>{req.remarks || '-'}</td>
                <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  {req.status === 'pending' && (
                    <div className="action-buttons">
                      <button className="btn-approve" onClick={() => handleApprove(req._id)}>Approve</button>
                      {rejectId === req._id ? (
                        <div className="reject-form">
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <button className="btn-reject" onClick={() => handleReject(req._id)}>Confirm</button>
                          <button className="btn-cancel" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn-reject" onClick={() => setRejectId(req._id)}>Reject</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;

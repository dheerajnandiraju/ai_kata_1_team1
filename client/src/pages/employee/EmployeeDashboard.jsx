import { useState, useEffect } from 'react';
import api from '../../api/axios';
import './EmployeeDashboard.css';

const EmployeeDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/requests');
        setRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'badge-approved';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="employee-dashboard">
      <h2>My Requests</h2>
      {requests.length === 0 ? (
        <p className="empty-state">No requests yet. Submit a new supply request to get started.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Remarks</th>
              <th>Status</th>
              <th>Date</th>
              <th>Rejection Reason</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id}>
                <td>{req.itemName}</td>
                <td>{req.quantity}</td>
                <td>{req.remarks || '-'}</td>
                <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>{req.status === 'rejected' ? req.rejectionReason || '-' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EmployeeDashboard;

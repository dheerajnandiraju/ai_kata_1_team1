import React, { useState, useEffect } from 'react';
import Header from './Header';
import { inventoryAPI, requestAPI } from '../services/api';
import '../styles/EmployeeDashboard.css';

/**
 * Employee Dashboard Component
 * Allows employees to submit supply requests and view history
 */
function EmployeeDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('new-request');
  const [inventory, setInventory] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryData, requestsData] = await Promise.all([
        inventoryAPI.getAll(),
        requestAPI.getAll({ employeeId: user.id })
      ]);
      setInventory(inventoryData);
      setMyRequests(requestsData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await requestAPI.create({
        employeeId: user.id,
        itemId: selectedItem,
        quantity: parseInt(quantity),
        remarks
      });
      
      setSuccess('Request submitted successfully!');
      setSelectedItem('');
      setQuantity(1);
      setRemarks('');
      await loadData();
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: '⏳', text: 'Pending', class: 'pending' },
      approved: { icon: '✅', text: 'Approved', class: 'approved' },
      rejected: { icon: '❌', text: 'Rejected', class: 'rejected' }
    };
    return badges[status] || { icon: '❓', text: status, class: '' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Header user={user} onLogout={onLogout} title="Employee Dashboard" />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = myRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="dashboard">
      <Header user={user} onLogout={onLogout} title="Employee Dashboard" />
      
      <div className="dashboard-content">
        {/* Stats Overview */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-icon">⏳</span>
            <div className="stat-info">
              <span className="stat-value">{pendingCount}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{approvedCount}</span>
              <span className="stat-label">Approved</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">❌</span>
            <div className="stat-info">
              <span className="stat-value">{rejectedCount}</span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>
        </div>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'new-request' ? 'active' : ''}`}
            onClick={() => setActiveTab('new-request')}
          >
            ➕ New Request
          </button>
          <button 
            className={`tab-button ${activeTab === 'my-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-requests')}
          >
            📋 My Requests ({myRequests.length})
          </button>
        </div>

        {activeTab === 'new-request' && (
          <div className="section">
            <h2>Submit New Supply Request</h2>
            
            {success && <div className="success-message">{success}</div>}
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-group">
                <label htmlFor="item">Select Item *</label>
                <select
                  id="item"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">-- Choose an item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category}) - Available: {item.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="remarks">Remarks (Optional)</label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any notes or justification for your request..."
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'my-requests' && (
          <div className="section">
            <h2>My Request History</h2>
            
            {myRequests.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>You haven't made any requests yet</p>
                <button onClick={() => setActiveTab('new-request')} className="cta-button">
                  Make your first request
                </button>
              </div>
            ) : (
              <div className="request-list">
                {myRequests.map(request => {
                  const statusInfo = getStatusBadge(request.status);
                  return (
                    <div key={request.id} className={`request-item ${request.status}`}>
                      <div className="request-main">
                        <div className="request-title">
                          <span className="item-name">{request.itemName}</span>
                          <span className={`status-badge ${statusInfo.class}`}>
                            {statusInfo.icon} {statusInfo.text}
                          </span>
                        </div>
                        <div className="request-meta">
                          <span>Quantity: {request.quantity}</span>
                          <span>•</span>
                          <span>Submitted: {formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                      
                      {request.remarks && (
                        <div className="request-remarks">
                          <strong>Your remarks:</strong> {request.remarks}
                        </div>
                      )}
                      
                      {request.status !== 'pending' && (
                        <div className="request-result">
                          <span>Processed by {request.processedBy} on {formatDate(request.processedAt)}</span>
                          {request.rejectionReason && (
                            <div className="rejection-reason">
                              <strong>Reason:</strong> {request.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeDashboard;

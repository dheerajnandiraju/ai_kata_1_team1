import React, { useState, useEffect } from 'react';
import Header from './Header';
import { inventoryAPI, requestAPI } from '../services/api';
import '../styles/AdminDashboard.css';

/**
 * Admin Dashboard Component
 * Displays inventory and manages supply requests
 */
function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('requests');
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState({ show: false, requestId: null });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [inventoryData, requestsData] = await Promise.all([
        inventoryAPI.getAll(),
        requestAPI.getAll()
      ]);
      setInventory(inventoryData);
      setRequests(requestsData);
    } catch (err) {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await requestAPI.approve(requestId, user.id);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    try {
      await requestAPI.reject(rejectModal.requestId, user.id, rejectionReason);
      setRejectModal({ show: false, requestId: null });
      setRejectionReason('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to reject request');
    }
  };

  const openRejectModal = (requestId) => {
    setRejectModal({ show: true, requestId });
    setRejectionReason('');
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const getStatusBadge = (status) => {
    const badges = {
      pending: '⏳ Pending',
      approved: '✅ Approved',
      rejected: '❌ Rejected'
    };
    return badges[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Header user={user} onLogout={onLogout} title="Admin Dashboard" />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header user={user} onLogout={onLogout} title="Admin Dashboard" />
      
      <div className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            📋 Pending Requests ({pendingRequests.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            📦 Inventory
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 Request History
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="section">
            <h2>Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✨</span>
                <p>No pending requests</p>
              </div>
            ) : (
              <div className="request-cards">
                {pendingRequests.map(request => {
                  const inventoryItem = inventory.find(i => i.id === request.itemId);
                  const availableQty = inventoryItem?.quantity || 0;
                  const canApprove = availableQty >= request.quantity;

                  return (
                    <div key={request.id} className="request-card">
                      <div className="request-header">
                        <span className="request-item">{request.itemName}</span>
                        <span className="request-quantity">Qty: {request.quantity}</span>
                      </div>
                      <div className="request-details">
                        <p><strong>Requested by:</strong> {request.employeeName}</p>
                        <p><strong>Date:</strong> {formatDate(request.createdAt)}</p>
                        {request.remarks && (
                          <p><strong>Remarks:</strong> {request.remarks}</p>
                        )}
                        <p className={canApprove ? 'available' : 'insufficient'}>
                          <strong>Available:</strong> {availableQty} units
                          {!canApprove && ' (Insufficient)'}
                        </p>
                      </div>
                      <div className="request-actions">
                        <button 
                          className="approve-btn"
                          onClick={() => handleApprove(request.id)}
                          disabled={!canApprove}
                          title={!canApprove ? 'Insufficient inventory' : ''}
                        >
                          ✓ Approve
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => openRejectModal(request.id)}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="section">
            <h2>Current Inventory</h2>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td><span className="category-badge">{item.category}</span></td>
                    <td>{item.quantity}</td>
                    <td>
                      <span className={`stock-status ${item.quantity > 20 ? 'in-stock' : item.quantity > 0 ? 'low-stock' : 'out-of-stock'}`}>
                        {item.quantity > 20 ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="section">
            <h2>Request History</h2>
            {processedRequests.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>No processed requests yet</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Processed</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRequests.map(request => (
                    <tr key={request.id}>
                      <td>{request.itemName}</td>
                      <td>{request.quantity}</td>
                      <td>{request.employeeName}</td>
                      <td><span className={`status-badge ${request.status}`}>{getStatusBadge(request.status)}</span></td>
                      <td>{formatDate(request.processedAt)}</td>
                      <td>{request.rejectionReason || request.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject Request</h3>
            <p>Please provide a reason for rejection (optional):</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setRejectModal({ show: false, requestId: null })}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

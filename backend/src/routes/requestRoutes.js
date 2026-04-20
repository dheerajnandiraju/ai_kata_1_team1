/**
 * Request Routes
 * Handles supply request creation, approval, and rejection
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const data = require('../data/store');

/**
 * GET /api/requests
 * Get all requests (optionally filter by status or employee)
 */
router.get('/', (req, res) => {
  let requests = [...data.requests];
  
  // Filter by status if provided
  if (req.query.status) {
    requests = requests.filter(r => r.status === req.query.status);
  }
  
  // Filter by employee if provided
  if (req.query.employeeId) {
    requests = requests.filter(r => r.employeeId === req.query.employeeId);
  }
  
  // Sort by creation date (newest first)
  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(requests);
});

/**
 * GET /api/requests/:id
 * Get a single request by ID
 */
router.get('/:id', (req, res) => {
  const request = data.requests.find(r => r.id === req.params.id);
  
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  res.json(request);
});

/**
 * POST /api/requests
 * Create a new supply request
 */
router.post('/', (req, res) => {
  const { employeeId, itemId, quantity, remarks } = req.body;

  // Validation
  if (!employeeId || !itemId || !quantity) {
    return res.status(400).json({ 
      error: 'Employee ID, item ID, and quantity are required' 
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  // Find employee
  const employee = data.users.find(u => u.id === employeeId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Find inventory item
  const item = data.inventory.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  // Create new request
  const newRequest = {
    id: uuidv4(),
    employeeId,
    employeeName: employee.name,
    itemId,
    itemName: item.name,
    quantity: parseInt(quantity),
    remarks: remarks || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    processedAt: null,
    processedBy: null,
    rejectionReason: null
  };

  data.requests.push(newRequest);
  res.status(201).json(newRequest);
});

/**
 * PUT /api/requests/:id/approve
 * Approve a pending request
 */
router.put('/:id/approve', (req, res) => {
  const { adminId } = req.body;
  const requestId = req.params.id;

  // Find the request
  const requestIndex = data.requests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = data.requests[requestIndex];

  // Check if already processed
  if (request.status !== 'pending') {
    return res.status(400).json({ 
      error: `Request has already been ${request.status}` 
    });
  }

  // Find admin
  const admin = data.users.find(u => u.id === adminId && u.role === 'admin');
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Find inventory item and check availability
  const itemIndex = data.inventory.findIndex(i => i.id === request.itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Inventory item not found' });
  }

  const item = data.inventory[itemIndex];
  if (item.quantity < request.quantity) {
    return res.status(400).json({ 
      error: `Insufficient inventory. Available: ${item.quantity}, Requested: ${request.quantity}` 
    });
  }

  // Update inventory
  data.inventory[itemIndex].quantity -= request.quantity;

  // Update request status
  data.requests[requestIndex] = {
    ...request,
    status: 'approved',
    processedAt: new Date().toISOString(),
    processedBy: admin.name
  };

  res.json({
    message: 'Request approved successfully',
    request: data.requests[requestIndex],
    updatedInventory: data.inventory[itemIndex]
  });
});

/**
 * PUT /api/requests/:id/reject
 * Reject a pending request
 */
router.put('/:id/reject', (req, res) => {
  const { adminId, rejectionReason } = req.body;
  const requestId = req.params.id;

  // Find the request
  const requestIndex = data.requests.findIndex(r => r.id === requestId);
  if (requestIndex === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = data.requests[requestIndex];

  // Check if already processed
  if (request.status !== 'pending') {
    return res.status(400).json({ 
      error: `Request has already been ${request.status}` 
    });
  }

  // Find admin
  const admin = data.users.find(u => u.id === adminId && u.role === 'admin');
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Update request status
  data.requests[requestIndex] = {
    ...request,
    status: 'rejected',
    processedAt: new Date().toISOString(),
    processedBy: admin.name,
    rejectionReason: rejectionReason || 'No reason provided'
  };

  res.json({
    message: 'Request rejected',
    request: data.requests[requestIndex]
  });
});

module.exports = router;

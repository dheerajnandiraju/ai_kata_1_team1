/**
 * Inventory Routes
 * Handles inventory viewing and management
 */

const express = require('express');
const router = express.Router();
const data = require('../data/store');

/**
 * GET /api/inventory
 * Get all inventory items
 */
router.get('/', (req, res) => {
  res.json(data.inventory);
});

/**
 * GET /api/inventory/:id
 * Get a single inventory item by ID
 */
router.get('/:id', (req, res) => {
  const item = data.inventory.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  res.json(item);
});

/**
 * GET /api/inventory/category/:category
 * Get inventory items by category
 */
router.get('/category/:category', (req, res) => {
  const items = data.inventory.filter(
    i => i.category.toLowerCase() === req.params.category.toLowerCase()
  );
  res.json(items);
});

module.exports = router;

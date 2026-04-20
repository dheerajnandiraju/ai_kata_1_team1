const InventoryItem = require('../models/InventoryItem');

exports.getAll = async (req, res) => {
  try {
    const items = await InventoryItem.find().sort({ itemName: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { itemName, quantity, description } = req.body;

    const existing = await InventoryItem.findOne({ itemName });
    if (existing) {
      return res.status(400).json({ message: 'Item already exists' });
    }

    const item = await InventoryItem.create({ itemName, quantity, description });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { itemName, quantity, description } = req.body;
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { itemName, quantity, description },
      { new: true, runValidators: true }
    );
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SupplyRequest = require('../models/SupplyRequest');
const InventoryItem = require('../models/InventoryItem');

exports.create = async (req, res) => {
  try {
    const { itemName, quantity, remarks } = req.body;
    const request = await SupplyRequest.create({
      employeeId: req.user.userId,
      itemName,
      quantity,
      remarks,
      status: 'pending',
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.user.role === 'employee') {
      filter.employeeId = req.user.userId;
    }

    const requests = await SupplyRequest.find(filter)
      .populate('employeeId', 'name username')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const request = await SupplyRequest.findById(req.params.id)
      .populate('employeeId', 'name username')
      .populate('reviewedBy', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (req.user.role === 'employee' && request.employeeId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const request = await SupplyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    const updatedItem = await InventoryItem.findOneAndUpdate(
      { itemName: request.itemName, quantity: { $gte: request.quantity } },
      { $inc: { quantity: -request.quantity } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(400).json({ message: 'Insufficient inventory' });
    }

    request.status = 'approved';
    request.reviewedBy = req.user.userId;
    request.reviewedAt = new Date();
    await request.save();

    const populated = await request.populate([
      { path: 'employeeId', select: 'name username' },
      { path: 'reviewedBy', select: 'name' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const request = await SupplyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.rejectionReason = req.body.rejectionReason || '';
    request.reviewedBy = req.user.userId;
    request.reviewedAt = new Date();
    await request.save();

    const populated = await request.populate([
      { path: 'employeeId', select: 'name username' },
      { path: 'reviewedBy', select: 'name' },
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

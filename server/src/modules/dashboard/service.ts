import mongoose from 'mongoose';
import SupplyRequest from '../requests/model';
import InventoryItem from '../inventory/model';

export async function getDashboard(role: 'admin' | 'employee', userId?: string) {
  const matchStage = role === 'employee' && userId
    ? { $match: { requestedBy: new mongoose.Types.ObjectId(userId) } }
    : { $match: {} };

  const pipeline = [
    matchStage,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ];

  const stats: { _id: string; count: number }[] = await SupplyRequest.aggregate(pipeline);

  let totalRequests = 0, pending = 0, approved = 0, rejected = 0;
  for (const s of stats) {
    totalRequests += s.count;
    if (s._id === 'pending') pending = s.count;
    else if (s._id === 'approved') approved = s.count;
    else if (s._id === 'rejected') rejected = s.count;
  }

  const result: {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    inventoryCount?: number;
    lowStockCount?: number;
  } = { totalRequests, pending, approved, rejected };

  if (role === 'admin') {
    const [inventoryCount, lowStockCount] = await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ lowStock: true }),
    ]);
    result.inventoryCount = inventoryCount;
    result.lowStockCount = lowStockCount;
  }

  return result;
}

import { SupplyRequest } from '../requests/model';
import { InventoryItem } from '../inventory/model';

export async function getStats(role: 'admin' | 'employee', userId: string) {
  const matchAll = role === 'admin' ? {} : { requestedBy: userId };
  const [stats] = await SupplyRequest.aggregate([
    { $match: matchAll },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      },
    },
  ]);

  const result = {
    totalRequests: stats?.total ?? 0,
    pending: stats?.pending ?? 0,
    approved: stats?.approved ?? 0,
    rejected: stats?.rejected ?? 0,
    ...(role === 'admin' && {
      inventoryCount: await InventoryItem.countDocuments(),
      lowStockCount: await InventoryItem.countDocuments({ lowStock: true }),
    }),
  };
  return result;
}

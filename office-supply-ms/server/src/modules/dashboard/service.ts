import { SupplyRequest } from '../requests/model';
import { InventoryItem } from '../inventory/model';

export async function getDashboardStats(role: string) {
  const [agg] = await SupplyRequest.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = await SupplyRequest.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats: any = { totalRequests: 0, pending: 0, approved: 0, rejected: 0 };
  for (const { _id, count } of counts) {
    stats[_id] = count;
    stats.totalRequests += count;
  }

  if (role === 'admin') {
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10);
    const [inventoryCount, lowStockCount] = await Promise.all([
      InventoryItem.countDocuments(),
      InventoryItem.countDocuments({ quantity: { $lt: threshold } }),
    ]);
    stats.inventoryCount = inventoryCount;
    stats.lowStockCount = lowStockCount;
  }

  return stats;
}

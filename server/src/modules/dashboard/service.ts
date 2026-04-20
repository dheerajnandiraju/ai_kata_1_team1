import { SupplyRequest } from '../requests/model';
import { InventoryItem } from '../inventory/model';

export const getDashboard = async (role: string) => {
  const [totalRequests, pending, approved, rejected] = await Promise.all([
    SupplyRequest.countDocuments(),
    SupplyRequest.countDocuments({ status: 'pending' }),
    SupplyRequest.countDocuments({ status: 'approved' }),
    SupplyRequest.countDocuments({ status: 'rejected' }),
  ]);
  const base = { totalRequests, pending, approved, rejected };
  if (role !== 'admin') return base;
  const [inventoryCount, lowStockCount] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryItem.countDocuments({ lowStock: true }),
  ]);
  return { ...base, inventoryCount, lowStockCount };
};

export interface UserDTO {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

export interface InventoryItemDTO {
  _id: string;
  name: string;
  quantity: number;
  lowStock: boolean;
}

export interface RequestDTO {
  _id: string;
  requestedBy: { _id: string; name: string; email: string };
  itemName: string;
  quantity: number;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  actionedBy?: { _id: string; name: string };
  actionedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardDTO {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  inventoryCount?: number;
  lowStockCount?: number;
}

export interface AuthPayload {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
}

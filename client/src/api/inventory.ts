import api from './axiosInstance';

export interface InventoryItem {
  _id: string;
  name: string;
  quantity: number;
  lowStock: boolean;
}

export const inventoryApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ items: InventoryItem[]; total: number }>('/inventory', { params }),
  create: (data: { name: string; quantity: number }) =>
    api.post<{ item: InventoryItem }>('/inventory', data),
  update: (id: string, data: { quantity: number }) =>
    api.patch<{ item: InventoryItem }>(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
};

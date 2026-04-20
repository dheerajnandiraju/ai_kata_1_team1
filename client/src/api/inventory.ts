import api from './axios';

export const inventoryApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/inventory', { params }),
  create: (data: { name: string; quantity: number }) =>
    api.post('/inventory', data),
  update: (id: string, quantity: number) =>
    api.patch(`/inventory/${id}`, { quantity }),
  remove: (id: string) =>
    api.delete(`/inventory/${id}`),
};

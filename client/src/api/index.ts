import api from './axios';

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post('/auth/register', { name, email, password });

export const logout = () => api.post('/auth/logout');

export const getDashboard = () => api.get('/dashboard');

export const getInventory = (params?: Record<string, string | number>) =>
  api.get('/inventory', { params });

export const createInventoryItem = (name: string, quantity: number) =>
  api.post('/inventory', { name, quantity });

export const updateInventoryItem = (id: string, quantity: number) =>
  api.patch(`/inventory/${id}`, { quantity });

export const deleteInventoryItem = (id: string) =>
  api.delete(`/inventory/${id}`);

export const submitRequest = (itemName: string, quantity: number, remarks?: string) =>
  api.post('/requests', { itemName, quantity, remarks });

export const getMyRequests = (params?: Record<string, string | number>) =>
  api.get('/requests/mine', { params });

export const getAllRequests = (params?: Record<string, string | number>) =>
  api.get('/requests', { params });

export const getPendingRequests = (params?: Record<string, string | number>) =>
  api.get('/requests/pending', { params });

export const approveRequest = (id: string) =>
  api.patch(`/requests/${id}/approve`);

export const rejectRequest = (id: string, reason?: string) =>
  api.patch(`/requests/${id}/reject`, { reason });

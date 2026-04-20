import api from './axiosInstance';

export interface DashboardData {
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  inventoryCount?: number;
  lowStockCount?: number;
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
};

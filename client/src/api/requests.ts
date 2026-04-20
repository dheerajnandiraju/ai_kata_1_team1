import api from './axiosInstance';

export interface SupplyRequest {
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

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const requestsApi = {
  create: (data: { itemName: string; quantity: number; remarks?: string }) =>
    api.post<{ request: SupplyRequest }>('/requests', data),
  mine: (params?: ListParams) =>
    api.get<{ requests: SupplyRequest[]; total: number }>('/requests/mine', { params }),
  all: (params?: ListParams) =>
    api.get<{ requests: SupplyRequest[]; total: number }>('/requests', { params }),
  pending: (params?: { page?: number; limit?: number }) =>
    api.get<{ requests: SupplyRequest[]; total: number }>('/requests/pending', { params }),
  approve: (id: string) =>
    api.patch<{ request: SupplyRequest }>(`/requests/${id}/approve`),
  reject: (id: string, data?: { reason?: string }) =>
    api.patch<{ request: SupplyRequest }>(`/requests/${id}/reject`, data),
};

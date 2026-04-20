import api from './axios';

export const requestsApi = {
  submit: (data: { itemName: string; quantity: number; remarks?: string }) =>
    api.post('/requests', data),
  mine: (params?: object) => api.get('/requests/mine', { params }),
  all: (params?: object) => api.get('/requests', { params }),
  pending: (params?: object) => api.get('/requests/pending', { params }),
  approve: (id: string) => api.patch(`/requests/${id}/approve`),
  reject: (id: string, reason?: string) => api.patch(`/requests/${id}/reject`, { reason }),
};

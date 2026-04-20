import api from './axiosInstance';

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  createdAt: string;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ users: UserItem[]; total: number }>('/users', { params }),

  changeRole: (id: string, role: 'admin' | 'employee') =>
    api.patch<{ user: UserItem }>(`/users/${id}/role`, { role }),

  deactivate: (id: string) =>
    api.patch<{ user: UserItem }>(`/users/${id}/deactivate`),

  reactivate: (id: string) =>
    api.patch<{ user: UserItem }>(`/users/${id}/reactivate`),
};

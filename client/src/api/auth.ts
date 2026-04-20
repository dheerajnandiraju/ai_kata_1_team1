import api from './axiosInstance';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload { name: string; email: string; password: string; }

export const authApi = {
  register: (data: RegisterPayload) => api.post<{ user: import('../store/authStore').User; accessToken: string }>('/auth/register', data),
  login: (data: LoginPayload) => api.post<{ user: import('../store/authStore').User; accessToken: string }>('/auth/login', data),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

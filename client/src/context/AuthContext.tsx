import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import * as api from '../api';
import toast from 'react-hot-toast';

interface AuthContextValue {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setAuth, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const { data } = await api.login(email, password);
    setAuth(data.user, data.accessToken);
    navigate(data.user.role === 'admin' ? '/admin' : '/employee');
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.register(name, email, password);
    setAuth(data.user, data.accessToken);
    navigate('/employee');
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    storeLogout();
    toast.success('Logged out');
    navigate('/login');
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

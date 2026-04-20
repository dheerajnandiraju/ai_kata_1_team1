import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import api from './api/client';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import AllRequests from './pages/admin/AllRequests';
import Inventory from './pages/admin/Inventory';
import PendingRequests from './pages/admin/PendingRequests';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyRequests from './pages/employee/MyRequests';
import NewRequest from './pages/employee/NewRequest';
import { AuthUser, useAuthStore } from './store/authStore';

function getRoleHome(user: AuthUser | null) {
  if (!user) {
    return '/login';
  }
  return user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
}

function AppLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
}

function AuthBootstrap() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const currentUser = useAuthStore.getState().user;
      const accessToken = localStorage.getItem('accessToken');
      if (currentUser && accessToken) {
        if (isMounted) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        const res = await api.post('/auth/refresh');
        if (isMounted) {
          setAuth(res.data.user, res.data.accessToken);
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
    // Session restore should run once on app boot to avoid refresh/login loops.
  }, []);

  const roleHome = useMemo(() => getRoleHome(user), [user]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="panel max-w-md text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-700">Restoring your session...</p>
          <p className="mt-1 text-xs text-slate-500">One quick moment while we secure your workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={roleHome} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={roleHome} replace /> : <Register />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={user?.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
          />

          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/request" element={<NewRequest />} />
            <Route path="/employee/history" element={<MyRequests />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/inventory" element={<Inventory />} />
            <Route path="/admin/pending" element={<PendingRequests />} />
            <Route path="/admin/requests" element={<AllRequests />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={roleHome} replace />} />
      <Route path="*" element={<Navigate to={roleHome} replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthBootstrap />;
}

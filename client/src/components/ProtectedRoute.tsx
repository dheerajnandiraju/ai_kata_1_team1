import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Navbar from './Navbar';
import type { CSSProperties } from 'react';

interface Props { role: 'admin' | 'employee'; }

export default function ProtectedRoute({ role }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return (
    <div style={layoutStyle}>
      <Navbar />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

const layoutStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
};
const mainStyle: CSSProperties = {
  marginLeft: 'var(--sidebar-w)',
  flex: 1,
  padding: '32px 40px',
  maxWidth: '1400px',
  width: '100%',
};

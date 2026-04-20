import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

const Navbar: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <nav style={{ padding: '0.75rem 1.5rem', background: '#1e293b', color: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to={user?.role === 'admin' ? '/admin' : '/employee'} style={{ color: '#f1f5f9', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
        OSMS
      </Link>
      {user && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user.role === 'admin' && (
            <Link to="/admin/users" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
              Users
            </Link>
          )}
          <span style={{ fontSize: '0.875rem' }}>{user.name} ({user.role})</span>
          <button onClick={handleLogout} style={{ cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff' }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

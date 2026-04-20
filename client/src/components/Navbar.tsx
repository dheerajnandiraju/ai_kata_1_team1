import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const links =
    user?.role === 'admin'
      ? [
          { to: '/admin', label: 'Dashboard' },
          { to: '/admin/inventory', label: 'Inventory' },
          { to: '/admin/pending', label: 'Pending' },
          { to: '/admin/requests', label: 'All Requests' },
        ]
      : [
          { to: '/employee', label: 'Dashboard' },
          { to: '/employee/new-request', label: 'New Request' },
          { to: '/employee/my-requests', label: 'My Requests' },
        ];

  return (
    <nav
      className="animate-fade-in-down"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 32px',
        height: 64,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(79,70,229,.25)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)',
      }}
    >
      <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>📦</span>
        SupplyMS
      </span>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {links.map((l) => {
          const active = pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              style={{
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 400,
                background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                transition: 'all 0.2s ease',
                backdropFilter: active ? 'blur(4px)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget.style.background = 'rgba(255,255,255,0.1)');
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget.style.background = 'transparent');
              }}
            >
              {l.label}
            </Link>
          );
        })}

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />

        <span style={{ opacity: 0.8, fontSize: '0.85rem', fontWeight: 500, marginRight: 4 }}>
          {user?.name}
        </span>

        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '7px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.22)';
            e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

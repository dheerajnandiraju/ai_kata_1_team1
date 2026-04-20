import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import {
  LayoutDashboard, PackagePlus, ClipboardList, Warehouse, Clock, List,
  LogOut, Package, ChevronRight, User
} from 'lucide-react';
import { type CSSProperties, type ReactNode } from 'react';

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Logged out');
  }

  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
    { to: '/admin/inventory', icon: <Warehouse size={19} />, label: 'Inventory' },
    { to: '/admin/requests/pending', icon: <Clock size={19} />, label: 'Pending Requests' },
    { to: '/admin/requests', icon: <List size={19} />, label: 'All Requests' },
  ];
  const employeeLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
    { to: '/requests/new', icon: <PackagePlus size={19} />, label: 'New Request' },
    { to: '/requests/mine', icon: <ClipboardList size={19} />, label: 'My Requests' },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <aside style={sidebarStyle}>
      {/* Brand header */}
      <div style={brandStyle}>
        <div style={logoCircleStyle}><Package size={22} color="#fff" /></div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.02em' }}>OSMS</div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Office Supplies</div>
        </div>
      </div>

      {/* Nav section label */}
      <div style={sectionLabelStyle}>Navigation</div>

      {/* Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <NavLink key={link.to} to={link.to} icon={link.icon} active={active}>
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={userFooterStyle}>
        <div style={avatarStyle}>
          <User size={16} color="var(--primary-600)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <button onClick={handleLogout} style={logoutBtnStyle} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

function NavLink({ to, icon, active, children }: { to: string; icon: ReactNode; active: boolean; children: ReactNode }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px', borderRadius: 'var(--radius-sm)',
      fontSize: '0.85rem', fontWeight: active ? 600 : 400,
      color: active ? '#fff' : 'rgba(255,255,255,0.65)',
      background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
      transition: 'var(--transition)',
      textDecoration: 'none',
    }}>
      <span style={{ opacity: active ? 1 : 0.6, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
    </Link>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const sidebarStyle: CSSProperties = {
  position: 'fixed', top: 0, left: 0, bottom: 0,
  width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(195deg, #1e293b 0%, #0f172a 100%)',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  zIndex: 100,
};
const brandStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
};
const logoCircleStyle: CSSProperties = {
  width: 38, height: 38, borderRadius: 'var(--radius-sm)',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
const sectionLabelStyle: CSSProperties = {
  padding: '20px 24px 8px', fontSize: '0.65rem', fontWeight: 700,
  color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase',
};
const userFooterStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '16px 16px', margin: '8px 12px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'rgba(255,255,255,0.06)',
};
const avatarStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'var(--primary-100)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
const logoutBtnStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '6px',
  color: 'rgba(255,255,255,0.5)', display: 'flex',
  transition: 'var(--transition)',
};

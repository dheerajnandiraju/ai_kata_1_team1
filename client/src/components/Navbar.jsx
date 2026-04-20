import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>Office Supply Manager</h1>
      </div>
      <div className="navbar-links">
        {user.role === 'employee' && (
          <>
            <Link to="/employee/dashboard">Dashboard</Link>
            <Link to="/employee/new-request">New Request</Link>
          </>
        )}
        {user.role === 'admin' && (
          <>
            <Link to="/admin/dashboard">Dashboard</Link>
            <Link to="/admin/inventory">Inventory</Link>
          </>
        )}
      </div>
      <div className="navbar-user">
        <span>{user.name} ({user.role})</span>
        <button onClick={logout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;

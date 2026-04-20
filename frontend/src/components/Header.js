import React from 'react';
import '../styles/Header.css';

/**
 * Header Component
 * Displays navigation and user info
 */
function Header({ user, onLogout, title }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-icon">📦</span>
        <h1>{title || 'Office Supply Management'}</h1>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className={`role-badge ${user.role}`}>{user.role}</span>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;

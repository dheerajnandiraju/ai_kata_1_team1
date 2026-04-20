import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usersApi, UserItem } from '../../api/users';
import { useAuthStore } from '../../store/authStore';

const PAGE_SIZE = 20;

const AdminUsers: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = async (p = 1) => {
    try {
      const res = await usersApi.list({ page: p, limit: PAGE_SIZE, search: search || undefined });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => { load(1); }, [search]);

  const handleRoleChange = async (user: UserItem) => {
    const newRole = user.role === 'admin' ? 'employee' : 'admin';
    if (!window.confirm(`Change ${user.name}'s role to ${newRole}?`)) return;
    try {
      await usersApi.changeRole(user._id, newRole);
      toast.success(`Role updated to ${newRole}`);
      load(page);
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    const action = user.isActive ? 'deactivate' : 'reactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return;
    try {
      if (user.isActive) {
        await usersApi.deactivate(user._id);
        toast.success(`${user.name} deactivated`);
      } else {
        await usersApi.reactivate(user._id);
        toast.success(`${user.name} reactivated`);
      }
      load(page);
    } catch {
      toast.error('Failed to update account status');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isSelf = (id: string) => currentUser?._id === id;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h1 style={styles.heading}>User Management</h1>
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{total} user{total !== 1 ? 's' : ''} total</span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        style={{ ...styles.input, marginBottom: '1rem', maxWidth: '320px' }}
      />

      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Joined</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No users found.
              </td>
            </tr>
          )}
          {users.map((user) => (
            <tr key={user._id} style={{ ...styles.row, opacity: user.isActive ? 1 : 0.55 }}>
              <td style={styles.td}>
                {user.name}
                {isSelf(user._id) && <span style={styles.youBadge}>you</span>}
              </td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>
                <span style={user.role === 'admin' ? styles.adminBadge : styles.empBadge}>
                  {user.role}
                </span>
              </td>
              <td style={styles.td}>
                <span style={user.isActive ? styles.activeBadge : styles.inactiveBadge}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td style={styles.td}>
                {!isSelf(user._id) && (
                  <>
                    <button
                      onClick={() => handleRoleChange(user)}
                      style={styles.roleBtn}
                      title={`Switch to ${user.role === 'admin' ? 'employee' : 'admin'}`}
                    >
                      → {user.role === 'admin' ? 'Employee' : 'Admin'}
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      style={user.isActive ? styles.deactivateBtn : styles.reactivateBtn}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </>
                )}
                {isSelf(user._id) && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button disabled={page <= 1} onClick={() => load(page - 1)} style={styles.pageBtn}>
            Previous
          </button>
          <span style={{ padding: '0 1rem' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)} style={styles.pageBtn}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page:         { maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' },
  topBar:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  heading:      { fontSize: '1.5rem' },
  input:        { padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem', width: '100%' },
  table:        { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  headerRow:    { background: '#f8fafc' },
  th:           { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' },
  row:          { borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' },
  td:           { padding: '0.75rem 1rem', fontSize: '0.9rem' },
  youBadge:     { marginLeft: '0.4rem', fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 },
  adminBadge:   { background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 },
  empBadge:     { background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 },
  activeBadge:  { background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 },
  inactiveBadge:{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 },
  roleBtn:      { marginRight: '0.4rem', padding: '0.25rem 0.65rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' },
  deactivateBtn:{ padding: '0.25rem 0.65rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' },
  reactivateBtn:{ padding: '0.25rem 0.65rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' },
  pagination:   { display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' },
  pageBtn:      { padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' },
};

export default AdminUsers;

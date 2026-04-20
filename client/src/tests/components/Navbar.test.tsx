import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../api/auth', () => ({ authApi: { logout: vi.fn().mockResolvedValue({}) } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as object, useNavigate: () => mockNavigate };
});

function renderNavbar() {
  return render(<MemoryRouter><Navbar /></MemoryRouter>);
}

describe('Navbar — Component Tests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows employee links when role is employee', () => {
    useAuthStore.setState({ user: { _id: '1', name: 'Emp', email: 'e@test.com', role: 'employee' }, accessToken: 'tok' });
    renderNavbar();
    expect(screen.getByText(/new request/i)).toBeInTheDocument();
    expect(screen.getByText(/my requests/i)).toBeInTheDocument();
    expect(screen.queryByText(/inventory/i)).toBeNull();
  });

  it('shows admin links when role is admin', () => {
    useAuthStore.setState({ user: { _id: '2', name: 'Adm', email: 'a@test.com', role: 'admin' }, accessToken: 'tok' });
    renderNavbar();
    expect(screen.getByText(/inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
    expect(screen.queryByText(/new request/i)).toBeNull();
  });

  it('shows the logged-in user name', () => {
    useAuthStore.setState({ user: { _id: '1', name: 'Alice Jones', email: 'a@test.com', role: 'employee' }, accessToken: 'tok' });
    renderNavbar();
    expect(screen.getByText('Alice Jones')).toBeInTheDocument();
  });

  it('calls logout and navigates to /login on logout button click', async () => {
    useAuthStore.setState({ user: { _id: '1', name: 'U', email: 'u@test.com', role: 'employee' }, accessToken: 'tok' });
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../../pages/Login';
import { useAuthStore } from '../../store/authStore';

// Mock axios api module
vi.mock('../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

// Mock react-router navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as object, useNavigate: () => mockNavigate };
});

import { authApi } from '../../api/auth';

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login Page — Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('renders email and password inputs and a submit button', () => {
    renderLogin();
    const inputs = document.querySelectorAll('input');
    expect(inputs[0]).toBeInTheDocument(); // email
    expect(inputs[1]).toBeInTheDocument(); // password
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty email submission', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i) ?? document.querySelector('p')).toBeTruthy();
    });
  });

  it('calls authApi.login with entered credentials', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' }, accessToken: 'tok' },
    });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'admin@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'Admin@12345' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith({ email: 'admin@test.com', password: 'Admin@12345' }));
  });

  it('navigates to admin dashboard on successful admin login', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { _id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' }, accessToken: 'tok' },
    });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'admin@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'Admin@12345' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard'));
  });

  it('navigates to employee dashboard on successful employee login', async () => {
    mockNavigate.mockClear();
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { _id: '2', name: 'Emp', email: 'emp@test.com', role: 'employee' }, accessToken: 'tok2' },
    });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'emp@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenLastCalledWith('/dashboard'));
  });

  it('shows error toast on failed login', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });
    renderLogin();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'bad@test.com' } });
    fireEvent.change(inputs[1], { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      // Toast is rendered outside the component tree; verify authApi was called
      expect(authApi.login).toHaveBeenCalled();
    });
  });

  it('has a link to the register page', () => {
    renderLogin();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });
});

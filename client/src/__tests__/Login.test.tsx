/**
 * Frontend component tests — Login page
 *
 * Covers:
 *  - Renders email + password fields and submit button
 *  - Shows Zod validation errors for empty fields
 *  - Shows validation error for malformed email
 *  - Calls authApi.login with correct data on valid submit
 *  - On success: stores auth, navigates to correct role page
 *  - On API error: shows toast error message
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from '../../src/pages/Login';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSetAuth = vi.fn();
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

const mockLogin = vi.fn();
vi.mock('../../src/api/auth', () => ({
  authApi: { login: (...args: unknown[]) => mockLogin(...args) },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email field, password field, and submit button', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/you@company\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error when email is empty on submit', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for malformed email', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when password is empty', async () => {
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'user@test.com');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/password required/i)).toBeInTheDocument();
    });
  });

  it('calls authApi.login with email + password on valid submit', async () => {
    mockLogin.mockResolvedValue({ data: { user: { role: 'employee', _id: '1', name: 'A', email: 'a@b.com' }, accessToken: 'tok' } });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'Password1');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'user@test.com', password: 'Password1' });
    });
  });

  it('navigates to /employee for employee role on success', async () => {
    mockLogin.mockResolvedValue({ data: { user: { role: 'employee', _id: '1', name: 'A', email: 'a@b.com' }, accessToken: 'tok' } });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'emp@test.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'Password1');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/employee'));
  });

  it('navigates to /admin for admin role on success', async () => {
    mockLogin.mockResolvedValue({ data: { user: { role: 'admin', _id: '2', name: 'B', email: 'b@b.com' }, accessToken: 'tok' } });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'Admin@12345');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'));
  });

  it('stores auth in Zustand store on success', async () => {
    const user = { role: 'employee' as const, _id: '1', name: 'A', email: 'a@b.com' };
    mockLogin.mockResolvedValue({ data: { user, accessToken: 'tok123' } });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'Password1');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockSetAuth).toHaveBeenCalledWith(user, 'tok123'));
  });

  it('shows toast error on API failure', async () => {
    const toast = await import('react-hot-toast');
    mockLogin.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } });
    renderLogin();
    await userEvent.type(screen.getByPlaceholderText(/you@company\.com/i), 'bad@test.com');
    await userEvent.type(screen.getByPlaceholderText(/••••/i), 'Password1');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });
});

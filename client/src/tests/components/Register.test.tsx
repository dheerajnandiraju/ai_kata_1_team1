import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../../pages/Register';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../api/auth', () => ({ authApi: { register: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as object, useNavigate: () => mockNavigate };
});

import { authApi } from '../../api/auth';

function renderRegister() {
  return render(<MemoryRouter><Register /></MemoryRouter>);
}

describe('Register Page — Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('renders name, email, password inputs and submit button', () => {
    renderRegister();
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('shows validation error when name is too short', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(document.querySelector('p')).toBeTruthy();
    });
  });

  it('calls authApi.register on valid form submission', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { _id: '1', name: 'New User', email: 'new@test.com', role: 'employee' }, accessToken: 'tok' },
    });
    renderRegister();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'New User' } });
    fireEvent.change(inputs[1], { target: { value: 'new@test.com' } });
    fireEvent.change(inputs[2], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({
      name: 'New User', email: 'new@test.com', password: 'password123',
    }));
  });

  it('navigates to /dashboard after successful registration', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { _id: '1', name: 'New', email: 'n@test.com', role: 'employee' }, accessToken: 'tok' },
    });
    renderRegister();
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'New User' } });
    fireEvent.change(inputs[1], { target: { value: 'n@test.com' } });
    fireEvent.change(inputs[2], { target: { value: 'pass1234' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('has a link back to the login page', () => {
    renderRegister();
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});

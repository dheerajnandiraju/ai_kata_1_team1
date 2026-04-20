/// <reference types="vitest" />

import { axe } from 'jest-axe';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../src/api/client';
import EmployeeDashboard from '../src/pages/employee/EmployeeDashboard';
import MyRequests from '../src/pages/employee/MyRequests';
import NewRequest from '../src/pages/employee/NewRequest';
import { useAuthStore } from '../src/store/authStore';
import toast from 'react-hot-toast';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function asMock<T extends (...args: any[]) => any>(fn: T) {
  return fn as unknown as ReturnType<typeof vi.fn>;
}

describe('Employee UI acceptance coverage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        _id: 'u-1',
        name: 'Employee Test',
        email: 'employee@test.com',
        role: 'employee',
      },
      accessToken: 'token',
    });
    vi.clearAllMocks();
  });

  it('AC-09: employee dashboard renders aggregated data and has no critical a11y violations', async () => {
    asMock(api.get).mockResolvedValueOnce({
      data: {
        totalRequests: 7,
        pending: 3,
        approved: 2,
        rejected: 2,
      },
    });

    const { container } = render(
      <MemoryRouter>
        <EmployeeDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Employee Dashboard' })).toBeInTheDocument();
    await waitFor(() => {
      expect(asMock(api.get)).toHaveBeenCalledWith('/dashboard');
    });
    expect(screen.getByText('7')).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('AC-11: submitting a request shows success toast and request appears in employee history', async () => {
    asMock(api.post).mockResolvedValueOnce({
      data: {
        request: {
          _id: 'r-1',
          itemName: 'Printer Paper',
          quantity: 4,
          status: 'pending',
        },
      },
    });

    asMock(api.get).mockResolvedValueOnce({
      data: {
        requests: [
          {
            _id: 'r-1',
            itemName: 'Printer Paper',
            quantity: 4,
            status: 'pending',
            createdAt: '2026-04-20T09:00:00.000Z',
            remarks: 'Urgent restock',
          },
        ],
        total: 1,
      },
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/employee/request']}>
        <Routes>
          <Route path="/employee/request" element={<NewRequest />} />
          <Route path="/employee/history" element={<MyRequests />} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('e.g. Staplers, A4 Paper, Pens'), 'Printer Paper');
    await user.type(screen.getByPlaceholderText('1'), '4');
    await user.type(screen.getByPlaceholderText('Any extra details that help the admin review faster'), 'Urgent restock');
    await user.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(asMock(api.post)).toHaveBeenCalledWith('/requests', {
        itemName: 'Printer Paper',
        quantity: 4,
        remarks: 'Urgent restock',
      });
    });

    expect(asMock(toast.success)).toHaveBeenCalledWith('Request submitted successfully!');
    expect(await screen.findByRole('heading', { name: 'My Requests' })).toBeInTheDocument();
    expect(await screen.findByText('Printer Paper')).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });
});

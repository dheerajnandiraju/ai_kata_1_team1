/**
 * Frontend component tests — NewRequest form
 *
 * Covers:
 *  - Renders all form fields
 *  - Shows Zod validation errors for missing/invalid fields
 *  - Calls requestsApi.create with correct data on valid submit
 *  - Navigates to /employee/my-requests on success
 *  - Shows toast error on API failure
 *  - Cancel button navigates back
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NewRequest from '../../src/pages/employee/NewRequest';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCreate = vi.fn();
vi.mock('../../src/api/requests', () => ({
  requestsApi: { create: (...args: unknown[]) => mockCreate(...args) },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderForm() {
  return render(
    <MemoryRouter>
      <NewRequest />
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NewRequest form', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders item name, quantity, remarks fields and submit button', () => {
    renderForm();
    expect(screen.getByPlaceholderText(/ballpoint/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument(); // number input
    expect(screen.getByPlaceholderText(/additional notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
  });

  it('shows validation error when item name is empty on submit', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(screen.getByText(/item name is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when quantity is 0', async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/ballpoint/i), 'Pens');
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '0');
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(screen.getByText(/quantity must be at least 1/i)).toBeInTheDocument();
    });
  });

  it('calls requestsApi.create with correct payload on valid submit', async () => {
    mockCreate.mockResolvedValue({ data: { request: { _id: '1', status: 'pending' } } });
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/ballpoint/i), 'Staplers');
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '3');
    await userEvent.type(screen.getByPlaceholderText(/additional notes/i), 'Needed urgently');
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ itemName: 'Staplers', quantity: 3, remarks: 'Needed urgently' })
      );
    });
  });

  it('navigates to /employee/my-requests on successful submit', async () => {
    mockCreate.mockResolvedValue({ data: { request: { _id: '1', status: 'pending' } } });
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/ballpoint/i), 'Paper');
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '10');
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/employee/my-requests');
    });
  });

  it('shows toast error on API failure', async () => {
    const toast = await import('react-hot-toast');
    mockCreate.mockRejectedValue(new Error('Network error'));
    renderForm();
    await userEvent.type(screen.getByPlaceholderText(/ballpoint/i), 'Pens');
    const qtyInput = screen.getByRole('spinbutton');
    await userEvent.clear(qtyInput);
    await userEvent.type(qtyInput, '1');
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Failed to submit request');
    });
  });

  it('cancel button calls navigate(-1)', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

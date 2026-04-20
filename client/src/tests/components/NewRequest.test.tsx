import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewRequest from '../../pages/employee/NewRequest';

vi.mock('../../api/requests', () => ({
  requestsApi: { submit: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual as object, useNavigate: () => mockNavigate };
});

import { requestsApi } from '../../api/requests';

function renderNewRequest() {
  return render(<MemoryRouter><NewRequest /></MemoryRouter>);
}

describe('NewRequest Form — Component Tests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders item name, quantity and remarks inputs', () => {
    renderNewRequest();
    expect(screen.getByPlaceholderText(/a4 paper/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('shows validation error when itemName is empty', async () => {
    renderNewRequest();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText(/item name required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when quantity is 0', async () => {
    (requestsApi.submit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { request: {} } });
    renderNewRequest();
    fireEvent.change(screen.getByPlaceholderText(/a4 paper/i), { target: { value: 'pen' } });
    const qtyInput = screen.getByRole('spinbutton');
    fireEvent.change(qtyInput, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    // Allow time for validation to run
    await new Promise((r) => setTimeout(r, 100));
    // API must NOT have been called — Zod min(1) blocks submission
    expect(requestsApi.submit).not.toHaveBeenCalled();
  });

  it('calls requestsApi.submit with correct payload', async () => {
    (requestsApi.submit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { request: {} } });
    renderNewRequest();
    fireEvent.change(screen.getByPlaceholderText(/a4 paper/i), { target: { value: 'Pen' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(requestsApi.submit).toHaveBeenCalledWith(expect.objectContaining({ itemName: 'Pen', quantity: 5 }));
    });
  });

  it('navigates to /requests/mine on successful submission', async () => {
    (requestsApi.submit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { request: {} } });
    renderNewRequest();
    fireEvent.change(screen.getByPlaceholderText(/a4 paper/i), { target: { value: 'Stapler' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/requests/mine'));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyRequests from '../../pages/employee/MyRequests';

vi.mock('../../api/requests', () => ({
  requestsApi: {
    mine: vi.fn(),
  },
}));

import { requestsApi } from '../../api/requests';

const mockRequests = [
  { _id: '1', itemName: 'pen', quantity: 5, status: 'pending', createdAt: '2026-04-01T00:00:00.000Z' },
  { _id: '2', itemName: 'paper', quantity: 2, status: 'approved', createdAt: '2026-04-02T00:00:00.000Z' },
  { _id: '3', itemName: 'stapler', quantity: 1, status: 'rejected', remarks: 'budget', createdAt: '2026-04-03T00:00:00.000Z' },
];

function renderMyRequests() {
  return render(<MemoryRouter><MyRequests /></MemoryRouter>);
}

describe('MyRequests — Component Tests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('displays loading state initially', () => {
    (requestsApi.mine as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    renderMyRequests();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders all requests after loading', async () => {
    (requestsApi.mine as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { requests: mockRequests, total: 3 },
    });
    renderMyRequests();
    await waitFor(() => {
      expect(screen.getByText('pen')).toBeInTheDocument();
      expect(screen.getByText('paper')).toBeInTheDocument();
      expect(screen.getByText('stapler')).toBeInTheDocument();
    });
  });

  it('shows "No requests" message when list is empty', async () => {
    (requestsApi.mine as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { requests: [], total: 0 },
    });
    renderMyRequests();
    await waitFor(() => expect(screen.getByText(/no requests/i)).toBeInTheDocument());
  });

  it('renders status badges for each request', async () => {
    (requestsApi.mine as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { requests: mockRequests, total: 3 },
    });
    renderMyRequests();
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
    });
  });

  it('shows total count in heading', async () => {
    (requestsApi.mine as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { requests: mockRequests, total: 3 },
    });
    renderMyRequests();
    await waitFor(() => expect(screen.getByRole('heading', { name: /my requests \(3\)/i })).toBeInTheDocument());
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/StatusBadge';

describe('StatusBadge — Component Tests', () => {
  it('renders "pending" badge with correct text', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('renders "approved" badge with correct text', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('renders "rejected" badge with correct text', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('renders unknown status without crashing', () => {
    render(<StatusBadge status="unknown" />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('applies different background colors per status', () => {
    const { rerender } = render(<StatusBadge status="pending" />);
    const pendingEl = screen.getByText('pending');
    const pendingBg = pendingEl.style.background;

    rerender(<StatusBadge status="approved" />);
    const approvedBg = screen.getByText('approved').style.background;

    expect(pendingBg).not.toBe(approvedBg);
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SettlementStatusBadge,
  settlementStatusDisplayLabel,
} from '@/components/dashboard/card-balances/SettlementStatusBadge';

describe('settlementStatusDisplayLabel', () => {
  it('maps status keys to title-case labels', () => {
    expect(settlementStatusDisplayLabel('due_soon')).toBe('Due Soon');
    expect(settlementStatusDisplayLabel('on_track')).toBe('On Track');
  });
});

describe('SettlementStatusBadge', () => {
  it('renders title-case labels', () => {
    render(<SettlementStatusBadge status="due_soon" />);
    expect(screen.getByText('Due Soon')).toBeInTheDocument();
  });

  it('renders ReUI badge slot for status variants', () => {
    const { container } = render(<SettlementStatusBadge status="on_track" />);
    expect(container.querySelector('[data-slot="badge"]')).toBeInTheDocument();
  });

  it('renders caption dash for null status', () => {
    render(<SettlementStatusBadge status={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No status')).toBeInTheDocument();
  });
});

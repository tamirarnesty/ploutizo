import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import { accountsRoute } from '@/lib/navigation';
import { Accounts } from './Accounts';

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccounts: () => ({ data: [], isLoading: false }),
}));

vi.mock('./AccountsTable', () => ({
  AccountsTable: () => <div>Accounts table</div>,
}));

vi.mock('./AccountSheet', () => ({
  AccountSheet: ({
    open,
    account,
    defaultType,
  }: {
    open: boolean;
    account: { id: string } | null;
    defaultType?: string;
  }) => (
    <div>
      <span data-testid="sheet-open">{open ? 'open' : 'closed'}</span>
      <span data-testid="sheet-mode">{account?.id ?? 'create'}</span>
      <span data-testid="sheet-default-type">{defaultType ?? ''}</span>
    </div>
  ),
}));

describe('Accounts router-state create handoff', () => {
  beforeEach(() => {
    resetRouterMocks();
  });

  it('stays closed when there is no create intent', () => {
    render(<Accounts />);

    expect(screen.getByTestId('sheet-open')).toHaveTextContent('closed');
    expect(screen.getByTestId('sheet-default-type')).toHaveTextContent('');
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });

  it('opens create with the requested type and clears consumed state', async () => {
    routerMocks.locationState.createAccount = { type: 'credit_card' };

    render(<Accounts />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-open')).toHaveTextContent('open');
    });
    expect(screen.getByTestId('sheet-mode')).toHaveTextContent('create');
    expect(screen.getByTestId('sheet-default-type')).toHaveTextContent(
      'credit_card'
    );
    expect(routerMocks.navigate).toHaveBeenCalledWith({
      ...accountsRoute,
      replace: true,
      state: { createAccount: undefined },
    });
  });

  it('keeps the create sheet open after consumed state is cleared', async () => {
    routerMocks.locationState.createAccount = { type: 'investment' };
    const { rerender } = render(<Accounts />);

    await waitFor(() => {
      expect(screen.getByTestId('sheet-open')).toHaveTextContent('open');
    });
    expect(routerMocks.navigate).toHaveBeenCalledTimes(1);

    routerMocks.locationState.createAccount = undefined;
    rerender(<Accounts />);

    expect(screen.getByTestId('sheet-open')).toHaveTextContent('open');
    expect(screen.getByTestId('sheet-default-type')).toHaveTextContent(
      'investment'
    );
    expect(routerMocks.navigate).toHaveBeenCalledTimes(1);
  });

  it('does not reopen from invalid or empty create intent', () => {
    routerMocks.locationState.createAccount = { type: 'other' };

    render(<Accounts />);

    expect(screen.getByTestId('sheet-open')).toHaveTextContent('closed');
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });
});

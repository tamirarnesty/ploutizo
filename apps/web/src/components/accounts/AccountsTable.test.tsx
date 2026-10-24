import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AccountsTable } from './AccountsTable';

vi.mock('@/hooks/persistedPageSize', () => ({
  usePersistedPageSize: () => ({
    pagination: { pageIndex: 0, pageSize: 25 },
    setPagination: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEffectiveTablePageSize', () => ({
  useEffectiveTablePageSize: () => 25,
}));

describe('AccountsTable', () => {
  it('shows the account creation call to action for a loaded empty account list', async () => {
    const user = userEvent.setup();
    const onAddClick = vi.fn();

    render(
      <AccountsTable
        accounts={[]}
        isLoading={false}
        onAddClick={onAddClick}
        onRowClick={vi.fn()}
      />
    );

    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
    expect(
      screen.getByText('Add your first account to start tracking transactions.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add account' }));
    expect(onAddClick).toHaveBeenCalledOnce();
  });
});

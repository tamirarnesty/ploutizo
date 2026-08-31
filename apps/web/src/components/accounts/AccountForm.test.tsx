import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountForm } from '@/components/accounts/AccountForm';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock('@clerk/tanstack-react-start', () => ({
  useUser: () => ({ user: { id: 'user_1' } }),
}));

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccountMembers: () => ({ data: [], isLoading: false }),
  useCreateAccount: () => ({ mutate: mocks.createMutate }),
  useUpdateAccount: () => ({ mutate: mocks.updateMutate }),
}));

vi.mock('@/lib/data-access/org', () => ({
  useGetOrgMembers: () => ({
    data: [
      {
        id: 'mem_1',
        externalId: 'user_1',
        displayName: 'Ada',
        imageUrl: null,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@ploutizo/ui/components/select', async () => {
  const React = await import('react');
  const SelectChangeContext = React.createContext<(value: string) => void>(
    () => {}
  );

  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
    }) =>
      React.createElement(
        SelectChangeContext.Provider,
        { value: onValueChange ?? (() => {}) },
        children
      ),
    SelectTrigger: ({
      id,
      children,
    }: {
      id?: string;
      children: React.ReactNode;
    }) => React.createElement('div', { id }, children),
    SelectValue: ({
      placeholder,
      children,
    }: {
      placeholder?: string;
      children?: React.ReactNode;
    }) => React.createElement('span', null, placeholder ?? children),
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
    SelectGroup: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', null, children),
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => {
      const onValueChange = React.useContext(SelectChangeContext);
      return React.createElement(
        'button',
        { type: 'button', onClick: () => onValueChange(value) },
        children
      );
    },
  };
});

vi.mock('@ploutizo/ui/components/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

describe('AccountForm', () => {
  beforeEach(() => {
    mocks.createMutate.mockReset();
    mocks.updateMutate.mockReset();
  });

  it('presents a fixed Financial institution dropdown instead of free text', () => {
    render(<AccountForm account={null} onClose={vi.fn()} />);

    expect(
      screen.queryByPlaceholderText('e.g. TD Bank')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Financial institution')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RBC' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Tangerine' })
    ).not.toBeInTheDocument();
  });

  it('requires a Financial institution for chequing accounts', async () => {
    const user = userEvent.setup();
    render(<AccountForm account={null} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Name'), 'Joint Chequing');
    await user.click(screen.getByRole('button', { name: 'Add account' }));

    await waitFor(() => {
      expect(
        screen.getByText('Financial institution is required.')
      ).toBeInTheDocument();
    });
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('submits the selected Financial institution id when editing', async () => {
    const user = userEvent.setup();
    render(
      <AccountForm
        account={{
          id: 'acct_1',
          orgId: 'org_1',
          name: 'Joint Chequing',
          type: 'chequing',
          institutionId: 'td',
          lastFour: '4410',
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          owners: [],
        }}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Joint Chequing',
          type: 'chequing',
          institutionId: 'td',
        }),
        expect.any(Object)
      );
    });
  });

  it('allows cash accounts without a Financial institution', async () => {
    const user = userEvent.setup();
    render(
      <AccountForm
        account={{
          id: 'acct_cash',
          orgId: 'org_1',
          name: 'Wallet',
          type: 'prepaid_cash',
          institutionId: null,
          lastFour: null,
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          owners: [],
        }}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText('Financial institution (optional)')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wallet',
          type: 'prepaid_cash',
          institutionId: null,
        }),
        expect.any(Object)
      );
    });
  });
});

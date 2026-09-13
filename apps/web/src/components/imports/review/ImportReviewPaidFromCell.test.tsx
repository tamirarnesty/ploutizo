import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, ImportDraftRow } from '@ploutizo/types';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportReviewPaidFromCell } from './importReviewCells';

const cardAccountId = '99999999-9999-4999-8999-999999999999';
const chequingId = '22222222-2222-4222-8222-222222222222';
const archivedSavingsId = '33333333-3333-4333-8333-333333333333';
const missingAccountId = '44444444-4444-4444-8444-444444444444';
const updateRow = vi.fn();
const refetchAccounts = vi.fn();

const chequingAccount: Account = {
  id: chequingId,
  orgId: 'org_1',
  name: 'Chequing',
  type: 'chequing',
  institutionId: null,
  lastFour: null,
  statementDueDay: null,
  archivedAt: null,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
  owners: [],
};

const archivedSavingsAccount: Account = {
  ...chequingAccount,
  id: archivedSavingsId,
  name: 'Old Savings',
  type: 'savings',
  archivedAt: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/data-access/imports/useImportReviewAutosave', () => ({
  useImportReviewAutosaveFailedRowIds: () => [],
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
      'aria-label': ariaLabel,
    }: {
      id?: string;
      children: React.ReactNode;
      'aria-label'?: string;
    }) =>
      React.createElement(
        'button',
        { id, type: 'button', role: 'combobox', 'aria-label': ariaLabel },
        children
      ),
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
        { type: 'button', role: 'option', onClick: () => onValueChange(value) },
        children
      );
    },
  };
});

const renderPaidFromCell = (
  row: ImportDraftRow,
  {
    accounts = [chequingAccount],
    accountsStatus,
  }: {
    accounts?: Account[];
    accountsStatus?: 'pending' | 'error' | 'success';
  } = {}
) =>
  render(
    <ImportDraftReviewProvider
      draftId={row.batchId}
      cardAccountId={cardAccountId}
      accounts={accounts}
      accountsStatus={accountsStatus}
      refetchAccounts={refetchAccounts}
      categories={[]}
      orgMembers={[]}
      updateRow={updateRow}
    >
      <ImportReviewPaidFromCell row={row} />
    </ImportDraftReviewProvider>
  );

describe('ImportReviewPaidFromCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists settlement funding accounts and saves the selection', async () => {
    const user = userEvent.setup();
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: null,
    });
    renderPaidFromCell(row);

    await user.click(
      screen.getByRole('combobox', { name: 'Paid from for Coffee' })
    );
    await user.click(screen.getByRole('option', { name: 'Chequing' }));

    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewCounterpartAccountId: chequingId,
    });
  });

  it('keeps a persisted archived funding account visible and marked', () => {
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: archivedSavingsId,
    });
    renderPaidFromCell(row, {
      accounts: [chequingAccount, archivedSavingsAccount],
    });

    expect(
      screen.getByRole('option', { name: 'Old Savings (archived)' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear paid from for Coffee' })
    ).toBeInTheDocument();
  });

  it('lets the user clear archived funding when no active accounts remain', async () => {
    const user = userEvent.setup();
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: archivedSavingsId,
    });
    renderPaidFromCell(row, { accounts: [archivedSavingsAccount] });

    expect(
      screen.queryByText('Add a chequing or savings account')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Old Savings (archived)' })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Clear paid from for Coffee' })
    );

    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewCounterpartAccountId: null,
    });
  });

  it('exposes a missing persisted funding id so it can be inspected and cleared', async () => {
    const user = userEvent.setup();
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: missingAccountId,
    });
    renderPaidFromCell(row, { accounts: [] });

    expect(
      screen.getByRole('option', { name: 'Unavailable account' })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Clear paid from for Coffee' })
    );

    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewCounterpartAccountId: null,
    });
  });

  it('reserves empty-account guidance for a successful empty response', () => {
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: null,
    });
    renderPaidFromCell(row, { accounts: [] });

    expect(
      screen.getByText('Add a chequing or savings account')
    ).toBeInTheDocument();
  });

  it('shows loading feedback while accounts are pending', () => {
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: null,
    });
    renderPaidFromCell(row, { accounts: [], accountsStatus: 'pending' });

    expect(screen.getByText('Loading accounts…')).toBeInTheDocument();
    expect(
      screen.queryByText('Add a chequing or savings account')
    ).not.toBeInTheDocument();
  });

  it('shows a retryable failure when accounts fail to load', async () => {
    const user = userEvent.setup();
    const row = makeImportDraftRow({
      reviewType: 'settlement',
      reviewCounterpartAccountId: null,
    });
    renderPaidFromCell(row, { accounts: [], accountsStatus: 'error' });

    expect(screen.getByText("Couldn't load accounts")).toBeInTheDocument();
    expect(
      screen.queryByText('Add a chequing or savings account')
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refetchAccounts).toHaveBeenCalledTimes(1);
  });
});

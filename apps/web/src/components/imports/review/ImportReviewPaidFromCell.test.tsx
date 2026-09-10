import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account, ImportDraftRow } from '@ploutizo/types';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportReviewPaidFromCell } from './importReviewCells';

const cardAccountId = '99999999-9999-4999-8999-999999999999';
const chequingId = '22222222-2222-4222-8222-222222222222';
const updateRow = vi.fn();

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

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccounts: () => ({
    data: [chequingAccount],
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

const renderPaidFromCell = (row: ImportDraftRow) =>
  render(
    <ImportDraftReviewProvider
      draftId={row.batchId}
      cardAccountId={cardAccountId}
      categories={[]}
      orgMembers={[]}
      updateRow={updateRow}
      failedRowIds={[]}
    >
      <ImportReviewPaidFromCell row={row} />
    </ImportDraftReviewProvider>
  );

describe('ImportReviewPaidFromCell', () => {
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
});

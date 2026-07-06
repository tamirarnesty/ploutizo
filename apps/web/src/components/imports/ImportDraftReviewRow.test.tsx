import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftRow } from '@ploutizo/types';
import type { Category } from '@/lib/data-access/categories';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportDraftReviewRowDetails } from './ImportDraftReviewRowDetails';
import { ImportReviewDescriptionCell } from './importReviewCells';

const mockCategory: Category = {
  id: 'cat_1',
  orgId: 'org_1',
  name: 'Dining',
  icon: null,
  colour: null,
  sortOrder: 0,
  archivedAt: null,
  createdAt: '2026-05-20T12:00:00Z',
};

const mutate = vi.fn();

vi.mock('@ploutizo/ui/components/date-picker', () => ({
  DatePicker: () => <div>Date picker</div>,
}));

vi.mock('@/components/currency/CurrencyInput', () => ({
  CurrencyInput: () => <input aria-label="Amount" />,
}));

vi.mock('@/components/categories/CategorySelect', () => ({
  CategorySelect: () => <div>Category select</div>,
}));

vi.mock('./ImportAssigneeField', () => ({
  ImportAssigneeField: () => <div>Assignee field</div>,
}));

vi.mock('@/components/transactions/TransactionTagPicker', () => ({
  TransactionTagPicker: () => <div>Tag picker</div>,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useUpdateImportDraftRow: () => ({ mutate }),
}));

const baseRow = (): ImportDraftRow => ({
  id: '33333333-3333-4333-8333-333333333333',
  batchId: '11111111-1111-4111-8111-111111111111',
  rowNumber: 1,
  status: 'ready',
  invalidReason: null,
  rawData: {},
  externalId: null,
  sourceDate: '2026-05-02',
  sourceAmount: '42.18',
  sourceDescription: 'Coffee',
  sourceType: 'expense',
  parsedDate: '2026-05-02',
  parsedAmount: 4218,
  parsedType: 'expense',
  parsedDescription: 'Coffee',
  reviewDate: '2026-05-02',
  reviewAmount: 4218,
  reviewType: 'expense',
  reviewDescription: 'Coffee',
  reviewCategoryId: 'cat_1',
  reviewAssigneeMemberIds: ['44444444-4444-4444-8444-444444444444'],
  reviewRefundLinkHint: null,
  reviewNotes: null,
  reviewTagIds: [],
  selectedForImport: false,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
});

const renderRowFields = (row: ImportDraftRow) =>
  render(
    <PendingInputFlushProvider>
      <ImportDraftReviewProvider
        draftId={row.batchId}
        categories={[mockCategory]}
        orgMembers={[]}
      >
        <ImportReviewDescriptionCell row={row} />
        <ImportDraftReviewRowDetails row={row} />
      </ImportDraftReviewProvider>
    </PendingInputFlushProvider>
  );

describe('ImportDraftReviewRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves unsaved notes when description blur-save updates the row', async () => {
    const user = userEvent.setup();
    const { rerender } = renderRowFields(baseRow());

    const descriptionInput = screen.getByLabelText('Description for Coffee');
    const notesInput = screen.getByLabelText('Notes for Coffee');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated coffee');
    await user.click(notesInput);
    await user.type(notesInput, 'Still editing notes');

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { reviewDescription: 'Updated coffee' },
      }),
      expect.any(Object)
    );

    rerender(
      <PendingInputFlushProvider>
        <ImportDraftReviewProvider
          draftId={baseRow().batchId}
          categories={[mockCategory]}
          orgMembers={[]}
        >
          <ImportReviewDescriptionCell
            row={{
              ...baseRow(),
              reviewDescription: 'Updated coffee',
              updatedAt: '2026-05-20T13:00:00Z',
            }}
          />
          <ImportDraftReviewRowDetails
            row={{
              ...baseRow(),
              reviewDescription: 'Updated coffee',
              updatedAt: '2026-05-20T13:00:00Z',
            }}
          />
        </ImportDraftReviewProvider>
      </PendingInputFlushProvider>
    );

    expect(screen.getByLabelText('Notes for Updated coffee')).toHaveValue(
      'Still editing notes'
    );
  });
});

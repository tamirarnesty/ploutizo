import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDraftRow } from '@ploutizo/types';
import type { Category } from '@/lib/data-access/categories';
import { evaluateImportDraftWorkingCopy } from '@/lib/data-access/imports/rederiveImportDraftWorkingCopy';
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

const updateRow = vi.fn();

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

vi.mock('@/lib/data-access/imports/rederiveImportDraftWorkingCopy', () => ({
  evaluateImportDraftWorkingCopy: vi.fn(),
  rederiveImportDraftWorkingCopy: vi.fn(),
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
  reviewCounterpartAccountId: null,
  reviewRefundOf: null,
  reviewRefundOfBatchRowId: null,
  reviewRefundLinkHint: null,
  reviewMatchedTransactionId: null,
  reviewMatchDismissed: false,
  reviewNotes: null,
  reviewTagIds: [],
  selectedForImport: false,
  createdAt: '2026-05-20T12:00:00Z',
  updatedAt: '2026-05-20T12:00:00Z',
});

const renderRowFields = (row: ImportDraftRow) =>
  render(
    <TooltipProvider delay={0}>
      <ImportDraftReviewProvider
        draftId={row.batchId}
        categories={[mockCategory]}
        orgMembers={[]}
        updateRow={updateRow}
        failedRowIds={[]}
      >
        <ImportReviewDescriptionCell row={row} />
        <ImportDraftReviewRowDetails row={row} />
      </ImportDraftReviewProvider>
    </TooltipProvider>
  );

describe('ImportDraftReviewRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes description and notes through the working-copy write API', async () => {
    const user = userEvent.setup();
    const row = baseRow();
    renderRowFields(row);

    const descriptionInput = screen.getByLabelText('Description for Coffee');
    const notesInput = screen.getByLabelText('Notes for Coffee');

    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated coffee');
    await user.type(notesInput, 'Still editing notes');

    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewDescription: 'Updated coffee',
    });
    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewNotes: 'Still editing notes',
    });
  });

  it('truncates the original description and reveals it on hover', async () => {
    const user = userEvent.setup();
    const row = {
      ...baseRow(),
      reviewDescription: 'Amazon',
      parsedDescription: 'AMAZON.CA*5O5BA0SV0 866-216-1072',
      sourceDescription: 'AMAZON.CA*5O5BA0SV0 866-216-1072',
    };
    renderRowFields(row);

    const original = screen.getByText(
      'Original: AMAZON.CA*5O5BA0SV0 866-216-1072'
    );
    expect(original).toHaveClass('truncate');

    await user.hover(original);
    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="tooltip-content"]')
      ).toHaveTextContent('Original: AMAZON.CA*5O5BA0SV0 866-216-1072');
    });
  });

  it('explains an exact match and keeps it as a suggestion until selected', () => {
    vi.mocked(evaluateImportDraftWorkingCopy).mockReturnValue(
      new Map([
        [
          baseRow().id,
          {
            status: 'ready',
            blockers: [],
            invalidReason: null,
            refundLink: null,
            refundSuggestion: null,
            match: {
              candidates: [
                {
                  transactionId: 'tx-1',
                  kind: 'external_id',
                  explanation: 'Exact external ID match on this card.',
                },
              ],
              exactCandidate: {
                transactionId: 'tx-1',
                kind: 'external_id',
                explanation: 'Exact external ID match on this card.',
              },
              advisoryCandidates: [],
              collisionRowIds: [],
              acceptedMatch: null,
              acceptedMatchValid: true,
              matchBlocked: false,
              matchNeedsReview: false,
              issues: [],
            },
          },
        ],
      ])
    );

    renderRowFields(baseRow());

    expect(
      screen.getByText(
        /Exact external ID match on this card\. Leave unselected to skip, or select to record as matched\./
      )
    ).toBeInTheDocument();
  });

  it('lets the user accept or dismiss an advisory match without mutating the existing transaction', async () => {
    const user = userEvent.setup();
    const row = baseRow();
    vi.mocked(evaluateImportDraftWorkingCopy).mockReturnValue(
      new Map([
        [
          row.id,
          {
            status: 'needs_review',
            blockers: ['match'],
            invalidReason: null,
            refundLink: null,
            refundSuggestion: null,
            match: {
              candidates: [
                {
                  transactionId: 'tx-1',
                  kind: 'fuzzy_description',
                  explanation:
                    'Similar description on the same date and amount.',
                },
              ],
              exactCandidate: null,
              advisoryCandidates: [
                {
                  transactionId: 'tx-1',
                  kind: 'fuzzy_description',
                  explanation:
                    'Similar description on the same date and amount.',
                },
              ],
              collisionRowIds: ['row-other'],
              acceptedMatch: null,
              acceptedMatchValid: true,
              matchBlocked: false,
              matchNeedsReview: true,
              issues: ['collision'],
            },
          },
        ],
      ])
    );

    renderRowFields(row);

    expect(
      screen.getByText(
        'Another row in this import uses the same external ID. Select one row and leave the other unselected.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Similar description on the same date and amount.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use this match' }));
    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewMatchedTransactionId: 'tx-1',
      reviewMatchDismissed: false,
    });

    await user.click(screen.getByRole('button', { name: 'Not a match' }));
    expect(updateRow).toHaveBeenCalledWith(row.id, {
      reviewMatchedTransactionId: null,
      reviewMatchDismissed: true,
    });
  });
});

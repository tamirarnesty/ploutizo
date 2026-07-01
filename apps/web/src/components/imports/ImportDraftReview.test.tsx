import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportDraftReview } from './ImportDraftReview';
import {
  DRAFT_ID,
  makeImportDraft,
  makeImportDraftRow,
} from './test-fixtures/importDraft';

const updateRowMutate = vi.fn();
const updateRowSelectionMutate = vi.fn();

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

vi.mock('./ImportReviewTagPicker', () => ({
  ImportReviewTagPicker: () => <div>Tag picker</div>,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useUpdateImportDraftRow: () => ({ mutate: updateRowMutate }),
  useUpdateImportDraftRowSelection: () => ({
    mutate: updateRowSelectionMutate,
  }),
}));

vi.mock('@/lib/data-access/categories', () => ({
  useGetCategories: () => ({
    data: [{ id: 'cat_1', name: 'Dining' }],
  }),
}));

vi.mock('@/lib/data-access/org', () => ({
  useGetOrgMembers: () => ({
    data: [
      {
        id: 'member_1',
        displayName: 'Tamir Arnesty',
        firstName: 'Tamir',
        imageUrl: null,
      },
    ],
  }),
}));

vi.mock('@/hooks/persistedPageSize', () => ({
  usePersistedPageSize: () => ({
    pagination: { pageIndex: 0, pageSize: 25 },
    setPagination: vi.fn(),
  }),
}));

const renderReview = (draft = makeImportDraft()) =>
  render(<ImportDraftReview draft={draft} />);

const getRowExpandButtons = () =>
  screen.getAllByRole('button', { name: /details for/i });

describe('ImportDraftReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts the review grid', () => {
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    expect(screen.getByLabelText('Import draft review')).toBeInTheDocument();
  });

  it('keeps Continue disabled with preview copy and tooltip-only blocker', () => {
    renderReview();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('Import commit coming soon')).toBeInTheDocument();
    expect(
      screen.queryByText('Select at least one row to continue.')
    ).not.toBeInTheDocument();
  });

  it('selects a row via the row checkbox', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    await user.click(screen.getByRole('checkbox', { name: 'Select Coffee' }));

    expect(updateRowMutate).toHaveBeenCalledTimes(1);
    expect(updateRowMutate).toHaveBeenCalledWith({
      draftId: DRAFT_ID,
      rowId: 'row_1',
      body: { selectedForImport: true },
    });
  });

  it('selects all rows on the page with a single batch mutation', async () => {
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_a',
            reviewDescription: 'Coffee',
            selectedForImport: false,
          }),
          makeImportDraftRow({
            id: 'row_b',
            rowNumber: 3,
            reviewDescription: 'Lunch',
            selectedForImport: false,
          }),
        ],
      })
    );

    await user.click(
      screen.getByRole('checkbox', { name: 'Select all rows on this page' })
    );

    expect(updateRowSelectionMutate).toHaveBeenCalledTimes(1);
    expect(updateRowSelectionMutate).toHaveBeenCalledWith({
      draftId: DRAFT_ID,
      body: {
        rowIds: ['row_a', 'row_b'],
        selectedForImport: true,
      },
    });
    expect(updateRowMutate).not.toHaveBeenCalled();
  });

  it('expands a row to show the notes field', async () => {
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            reviewDescription: 'Coffee',
          }),
        ],
      })
    );

    const expandButton = screen.getByRole('button', {
      name: 'Expand details for Coffee',
    });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(expandButton);

    expect(
      screen.getByRole('button', { name: 'Collapse details for Coffee' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Notes for Coffee')).toBeInTheDocument();
  });

  it('expands and collapses all rows from the header control', async () => {
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole('button', { name: 'Expand all rows' }));

    for (const button of getRowExpandButtons()) {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    }

    await user.click(screen.getByRole('button', { name: 'Collapse all rows' }));

    for (const button of getRowExpandButtons()) {
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('shows an indeterminate header checkbox when some rows are selected', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_a',
            reviewDescription: 'Coffee',
            selectedForImport: true,
          }),
          makeImportDraftRow({
            id: 'row_b',
            rowNumber: 3,
            reviewDescription: 'Lunch',
            selectedForImport: false,
          }),
        ],
      })
    );

    const headerCheckbox = screen.getByRole('checkbox', {
      name: 'Select all rows on this page',
    });
    expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed');
  });

  it('shows an empty state when no rows are reviewable', () => {
    renderReview(
      makeImportDraft({
        validRowCount: 0,
        invalidRowCount: 1,
        rows: [
          makeImportDraftRow({
            status: 'invalid',
            invalidReason: 'Amount must be a positive number.',
          }),
        ],
      })
    );

    expect(screen.getByText('No transactions to review')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Import draft review')
    ).not.toBeInTheDocument();
  });

  it('defaults needs_review rows to expanded on first render', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_needs_review',
            status: 'needs_review',
            reviewDescription: 'Groceries',
            reviewCategoryName: null,
          }),
        ],
      })
    );

    const expandButton = screen.getByRole('button', {
      name: 'Collapse details for Groceries',
    });
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Notes for Groceries')).toBeInTheDocument();
  });
});

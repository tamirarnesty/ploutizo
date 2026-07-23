import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useImportReviewSession } from '@/lib/data-access/imports';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportReview } from './ImportReview';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useBlocker: vi.fn(),
}));

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
  useImportReviewSession: vi.fn(),
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

const draft = makeImportDraft({
  rowCount: 1,
  validRowCount: 1,
  invalidRowCount: 0,
  rows: [makeImportDraftRow()],
});

const toSession = (value = draft) => {
  const { rows, ...meta } = value;
  return {
    meta,
    rows,
    isLoading: false,
    isError: false,
    updateRow: vi.fn(),
    setSelection: vi.fn(),
    autosaveStatus: 'idle' as const,
    failedRowIds: [] as string[],
    hasUnsavedWork: false,
    retryAutosave: vi.fn(),
    flush: vi.fn(() => Promise.resolve(true)),
  };
};

describe('ImportReview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a missing draft empty state', () => {
    vi.mocked(useImportReviewSession).mockReturnValue({
      ...toSession(),
      meta: undefined,
      rows: [],
      isLoading: false,
      isError: true,
    });

    render(<ImportReview draftId="missing" />);

    expect(screen.getByText('Draft not available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/transactions/import'
    );
  });

  it('renders the review grid for an active draft from the working-copy session', () => {
    vi.mocked(useImportReviewSession).mockReturnValue(toSession());

    render(<ImportReview draftId="draft_1" />);

    expect(useImportReviewSession).toHaveBeenCalledWith('draft_1');
    expect(
      screen.getByRole('navigation', { name: 'breadcrumb' })
    ).toBeInTheDocument();
    expect(screen.getByText('Review import')).toBeInTheDocument();
    expect(
      screen.getByText('statement.csv · 1 transaction')
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('Import commit coming soon')).toBeInTheDocument();
    expect(
      screen.queryByText('Select at least one row to continue.')
    ).not.toBeInTheDocument();
  });

  it('shows an empty state when no rows are reviewable', () => {
    const emptyDraft = makeImportDraft({
      validRowCount: 0,
      invalidRowCount: 1,
      rowCount: 1,
      rows: [
        makeImportDraftRow({
          status: 'invalid',
          invalidReason: 'Amount must be a positive number.',
        }),
      ],
    });
    vi.mocked(useImportReviewSession).mockReturnValue(toSession(emptyDraft));

    render(<ImportReview draftId="draft_1" />);

    expect(screen.getByText('No transactions to review')).toBeInTheDocument();
    expect(
      screen.getByText(/Every row in this draft is invalid or skipped/)
    ).toBeInTheDocument();
  });
});

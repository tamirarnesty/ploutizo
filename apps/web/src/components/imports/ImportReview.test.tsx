import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetImportDraft } from '@/lib/data-access/imports';
import { ImportReview } from './ImportReview';

vi.mock('./ImportDraftReviewTable', () => ({
  ImportDraftReviewTable: () => (
    <div data-testid="import-draft-review-table">Review table</div>
  ),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
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

vi.mock('./ImportReviewTagPicker', () => ({
  ImportReviewTagPicker: () => <div>Tag picker</div>,
}));

vi.mock('@/lib/data-access/imports', () => ({
  useGetImportDraft: vi.fn(),
  useUpdateImportDraftRow: () => ({
    mutate: vi.fn(),
  }),
  useUpdateImportDraftRowSelection: () => ({
    mutate: vi.fn(),
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

vi.mock('@/lib/data-access/tags', () => ({
  useGetTags: () => ({
    data: [{ id: 'tag_1', name: 'amex', archivedAt: null }],
  }),
  useCreateTag: () => ({ mutate: vi.fn() }),
}));

const draft = {
  id: 'draft_1',
  accountId: 'acct_1',
  accountName: 'Visa',
  accountInstitution: 'TD',
  accountLastFour: '1234',
  source: 'ploutizo_normalized',
  status: 'draft' as const,
  fileName: 'statement.csv',
  rowCount: 1,
  validRowCount: 1,
  invalidRowCount: 0,
  importedAt: '2026-05-20T12:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-05-20T12:00:00.000Z',
  updatedAt: '2026-05-20T12:00:00.000Z',
  rows: [
    {
      id: 'row_1',
      batchId: 'draft_1',
      rowNumber: 2,
      status: 'ready' as const,
      invalidReason: null,
      rawData: { date: '2026-05-02', description: 'Coffee' },
      externalId: 'visa-1001',
      sourceDate: '2026-05-02',
      sourceAmount: '42.18',
      sourceDescription: 'Coffee',
      sourceType: 'expense',
      parsedDate: '2026-05-02',
      parsedAmount: 4218,
      parsedType: 'expense' as const,
      parsedDescription: 'Coffee',
      reviewDate: '2026-05-02',
      reviewAmount: 4218,
      reviewType: 'expense' as const,
      reviewDescription: 'Coffee',
      reviewCategoryName: 'Dining',
      reviewAssigneeHint: 'Tamir Arnesty',
      reviewAssigneeMemberIds: ['member_1'],
      reviewRefundLinkHint: null,
      reviewNotes: null,
      reviewTags: [],
      selectedForImport: false,
      createdAt: '2026-05-20T12:00:00.000Z',
      updatedAt: '2026-05-20T12:00:00.000Z',
    },
  ],
};

describe('ImportReview', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a missing draft empty state', () => {
    vi.mocked(useGetImportDraft).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(<ImportReview draftId="missing" />);

    expect(screen.getByText('Draft not available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/transactions/import'
    );
  });

  it('renders the review grid for an active draft', () => {
    vi.mocked(useGetImportDraft).mockReturnValue({
      data: draft,
      isLoading: false,
      isError: false,
    } as never);

    render(<ImportReview draftId="draft_1" />);

    expect(
      screen.getByRole('navigation', { name: 'breadcrumb' })
    ).toBeInTheDocument();
    expect(screen.getByText('Review import')).toBeInTheDocument();
    expect(
      screen.getByText('statement.csv · 1 transaction')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(
      screen.getByText('Select at least one row to continue.')
    ).toBeInTheDocument();
  });

  it('shows an empty state when no rows are reviewable', () => {
    vi.mocked(useGetImportDraft).mockReturnValue({
      data: {
        ...draft,
        validRowCount: 0,
        invalidRowCount: 1,
        rows: [
          {
            ...draft.rows[0],
            status: 'invalid' as const,
            invalidReason: 'Amount must be a positive number.',
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as never);

    render(<ImportReview draftId="draft_1" />);

    expect(screen.getByText('No transactions to review')).toBeInTheDocument();
    expect(
      screen.getByText(/Every row in this draft is invalid or skipped/)
    ).toBeInTheDocument();
  });
});

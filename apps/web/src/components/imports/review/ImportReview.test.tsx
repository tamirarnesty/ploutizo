import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import {
  IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE,
  useImportReviewSession,
} from '@/lib/data-access/imports';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportReview } from './ImportReview';

const reviewToastMocks = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    info: reviewToastMocks.info,
    error: reviewToastMocks.error,
  },
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

vi.mock('@/lib/data-access/imports/useImportReviewSession', () => ({
  useImportReviewSession: vi.fn(),
}));

const continueMocks = vi.hoisted(() => ({
  continueImport: vi.fn(),
  isPending: false,
  error: null as unknown,
  reset: vi.fn(),
}));

vi.mock('@/lib/data-access/imports/useContinueImportDraft', () => ({
  useContinueImportDraft: () => ({
    continueImport: continueMocks.continueImport,
    isPending: continueMocks.isPending,
    error: continueMocks.error,
    reset: continueMocks.reset,
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
        email: 'tamir@example.com',
        firstName: 'Tamir',
        lastName: 'Arnesty',
        imageUrl: null,
      },
    ],
  }),
}));

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccounts: () => ({
    data: [],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
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
    retryAutosave: vi.fn(),
    flush: vi.fn(() => Promise.resolve(true)),
  };
};

const renderReview = (draftId = 'draft_1') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ImportReview draftId={draftId} />
    </QueryClientProvider>
  );
};

describe('ImportReview', () => {
  beforeEach(() => {
    resetRouterMocks();
    vi.clearAllMocks();
    continueMocks.error = null;
    continueMocks.isPending = false;
    continueMocks.continueImport.mockResolvedValue({
      id: 'prep_1',
      orgId: 'org_1',
      batchId: 'draft_1',
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
      outcomes: [],
    });
  });

  it('shows a missing draft empty state', () => {
    vi.mocked(useImportReviewSession).mockReturnValue({
      ...toSession(),
      meta: undefined,
      rows: [],
      isLoading: false,
      isError: true,
    });

    renderReview('missing');

    expect(screen.getByText('Draft not available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
  });

  it('renders the review grid for an active draft from the working-copy session', () => {
    vi.mocked(useImportReviewSession).mockReturnValue(toSession());

    renderReview();

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

    renderReview();

    expect(screen.getByText('No transactions to review')).toBeInTheDocument();
    expect(
      screen.getByText(/Every row in this draft is invalid/)
    ).toBeInTheDocument();
  });

  it('toasts a prepare-again message and refetches the draft from inbound router state', async () => {
    routerMocks.locationState.importReview = { prepareAgain: true };
    vi.mocked(useImportReviewSession).mockReturnValue(toSession());

    renderReview();

    await waitFor(() =>
      expect(reviewToastMocks.info).toHaveBeenCalledWith(
        IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE
      )
    );
    await waitFor(() =>
      expect(routerMocks.navigate).toHaveBeenCalledWith({
        to: '/import/$draftId',
        params: { draftId: 'draft_1' },
        replace: true,
        state: { importReview: undefined },
      })
    );
  });
});

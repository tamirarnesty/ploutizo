import '@/test/mockTanstackRouter';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import type { Account, ImportReviewRow } from '@ploutizo/types';
import { makeImportDraft } from '../test-fixtures/importDraft';
import { ImportDraftReview } from './ImportDraftReview';

export const updateRow = vi.fn();
export const setSelection = vi.fn();
export const flush = vi.fn(() => Promise.resolve(true));

const paginationMocks = vi.hoisted(() => ({
  pagination: { pageIndex: 0, pageSize: 25 },
  setPagination: vi.fn(),
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

vi.mock('@/components/members/MemberToggleGroup', () => ({
  MemberToggleGroup: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="member-toggle-group" data-disabled={disabled}>
      Toggle
    </div>
  ),
}));

vi.mock('@/components/transactions/TransactionTagPicker', () => ({
  TransactionTagPicker: () => <div>Tag picker</div>,
}));

const defaultAccountsQueryData: Account[] = [
  {
    id: 'cheq_1',
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
  },
];

const accountsQueryMocks = vi.hoisted(() => ({
  data: undefined as Account[] | undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock('@/lib/data-access/accounts', () => ({
  useGetAccounts: () => accountsQueryMocks,
}));

vi.mock('@/lib/data-access/categories', () => ({
  useGetCategories: () => ({
    data: [{ id: 'cat_1', name: 'Dining' }],
  }),
}));

vi.mock('@/lib/data-access/household', () => ({
  useGetHouseholdMembers: () => ({
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

const continueMocks = vi.hoisted(() => ({
  continueImport: vi.fn(),
  isPending: false,
  error: null as unknown,
  reset: vi.fn(),
}));

const reviewToastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    error: reviewToastMocks.error,
    info: reviewToastMocks.info,
  },
}));

vi.mock('@/lib/data-access/imports/useContinueImportDraft', () => ({
  useContinueImportDraft: () => ({
    continueImport: continueMocks.continueImport,
    isPending: continueMocks.isPending,
    error: continueMocks.error,
    reset: continueMocks.reset,
  }),
}));

const flushPendingInputs = vi.fn();

vi.mock('@/lib/money/pending-input-flush', () => ({
  PendingInputFlushProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useFlushPendingInputs: () => flushPendingInputs,
  useRegisterInputFlush: () => undefined,
}));

vi.mock('@/hooks/persistedPageSize', () => ({
  usePersistedPageSize: () => ({
    pagination: paginationMocks.pagination,
    setPagination: paginationMocks.setPagination,
  }),
}));

const autosaveStatusMock = vi.hoisted(() => ({
  current: 'idle' as 'idle' | 'saving' | 'saved' | 'failed',
}));

const reviewRowsById = vi.hoisted(() => new Map<string, ImportReviewRow>());

vi.mock('@/lib/data-access/imports/useImportReviewRow', () => ({
  useImportReviewRow: (_draftId: string, rowId: string) =>
    reviewRowsById.get(rowId),
}));

vi.mock('@/lib/data-access/imports/importReviewEvaluations', () => ({
  getImportReviewRowEvaluation: () => null,
  subscribeImportReviewEvaluations: () => () => undefined,
  publishImportReviewEvaluations: vi.fn(),
}));

vi.mock('@/lib/data-access/imports/useImportReviewAutosave', () => ({
  useImportReviewAutosaveStatus: () => autosaveStatusMock.current,
  useImportReviewAutosaveRowFailed: () => false,
}));

export const reviewSessionProps = {
  updateRow,
  setSelection,
  flush,
};

export const renderReview = (draft = makeImportDraft()) => {
  const { rows, ...meta } = draft;
  reviewRowsById.clear();
  for (const row of rows) {
    reviewRowsById.set(row.id, row);
  }
  return render(
    <TooltipProvider delay={0}>
      <ImportDraftReview meta={meta} rows={rows} {...reviewSessionProps} />
    </TooltipProvider>
  );
};

export const renderLoadingReview = () =>
  render(
    <TooltipProvider delay={0}>
      <ImportDraftReview isLoading {...reviewSessionProps} />
    </TooltipProvider>
  );

export const getRowExpandButtons = () =>
  screen.getAllByRole('button', { name: /details for/i });

/** Test-only handles for mocks that must stay hoisted inside this module. */
export const importDraftReviewTestControls = {
  get pagination() {
    return paginationMocks;
  },
  get accounts() {
    return accountsQueryMocks;
  },
  get autosaveStatus() {
    return autosaveStatusMock;
  },
  get continue() {
    return continueMocks;
  },
  get flushPendingInputs() {
    return flushPendingInputs;
  },
  get reviewToast() {
    return reviewToastMocks;
  },
  get reviewRowsById() {
    return reviewRowsById;
  },
};

export const setupImportDraftReviewTests = () => {
  autosaveStatusMock.current = 'idle';
  vi.clearAllMocks();
  sessionStorage.clear();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  paginationMocks.pagination = { pageIndex: 0, pageSize: 25 };
  continueMocks.isPending = false;
  continueMocks.error = null;
  continueMocks.continueImport.mockResolvedValue({
    batchId: 'draft_1',
    rowCount: 1,
    counts: { created: 0, matched: 0, skipped: 0, invalid: 0 },
    created: [],
    matched: [],
  });
  flush.mockResolvedValue(true);
  accountsQueryMocks.data = defaultAccountsQueryData;
  accountsQueryMocks.isPending = false;
  accountsQueryMocks.isError = false;
};

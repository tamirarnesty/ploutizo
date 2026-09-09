import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportDraftReview } from './ImportDraftReview';

const updateRow = vi.fn();
const setSelection = vi.fn();
const retryAutosave = vi.fn();
const flush = vi.fn(() => Promise.resolve(true));

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

const continueMocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
  error: null as unknown,
  reset: vi.fn(),
}));

const reviewRouterMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const reviewToastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => reviewRouterMocks.navigate,
}));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    error: reviewToastMocks.error,
  },
}));

vi.mock('@/lib/data-access/imports/useContinueImportDraft', () => ({
  useContinueImportDraft: () => ({
    mutateAsync: continueMocks.mutateAsync,
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

const reviewSessionProps = {
  updateRow,
  setSelection,
  autosaveStatus: 'idle' as const,
  failedRowIds: [] as string[],
  hasUnsavedWork: false,
  retryAutosave,
  flush,
};

const renderReview = (draft = makeImportDraft()) => {
  const { rows, ...meta } = draft;
  return render(
    <TooltipProvider delay={0}>
      <ImportDraftReview meta={meta} rows={rows} {...reviewSessionProps} />
    </TooltipProvider>
  );
};

const renderLoadingReview = () =>
  render(
    <TooltipProvider delay={0}>
      <ImportDraftReview isLoading {...reviewSessionProps} />
    </TooltipProvider>
  );

const getRowExpandButtons = () =>
  screen.getAllByRole('button', { name: /details for/i });

describe('ImportDraftReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    paginationMocks.pagination = { pageIndex: 0, pageSize: 25 };
    continueMocks.isPending = false;
    continueMocks.error = null;
    continueMocks.mutateAsync.mockResolvedValue({
      id: 'prep_1',
      orgId: 'org_1',
      batchId: 'draft_1',
      revision: 1,
      createdAt: '2026-05-20T12:00:00.000Z',
      outcomes: [],
    });
    flush.mockResolvedValue(true);
  });

  it('mounts the review grid', () => {
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('keeps Continue disabled when no rows are selected', () => {
    renderReview();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(
      screen.getByText('Select at least one row to continue.')
    ).toBeInTheDocument();
  });

  it('selects a row via the row checkbox', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    await user.click(screen.getByRole('checkbox', { name: 'Select Coffee' }));

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenCalledWith(['row_1'], true);
    expect(updateRow).not.toHaveBeenCalled();
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

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenCalledWith(['row_a', 'row_b'], true);
    expect(updateRow).not.toHaveBeenCalled();
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
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows pagination controls when the draft has more rows than one page', () => {
    const rows = Array.from({ length: 26 }, (_, index) =>
      makeImportDraftRow({
        id: `row_${index}`,
        rowNumber: index + 1,
        reviewDescription: `Transaction ${index}`,
        selectedForImport: false,
      })
    );

    renderReview(makeImportDraft({ rows }));

    expect(screen.getByText('1 - 25 of 26')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go to next page' })
    ).toBeInTheDocument();
  });

  it('renders skeleton rows matching the page size while loading', () => {
    renderLoadingReview();

    const grid = screen.getByRole('table');
    const bodyRows = within(grid).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(25);
  });

  it('flushes description edits before batch select-all', async () => {
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

    const descriptionInput = screen.getByLabelText('Description for Coffee');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated coffee');

    await user.click(
      screen.getByRole('checkbox', { name: 'Select all rows on this page' })
    );

    expect(updateRow).toHaveBeenCalledWith('row_a', {
      reviewDescription: 'Updated coffee',
    });
    expect(setSelection).toHaveBeenCalledWith(['row_a', 'row_b'], true);
    expect(updateRow.mock.invocationCallOrder[0]).toBeLessThan(
      setSelection.mock.invocationCallOrder[0]
    );
  });

  it('keeps Continue enabled when selected rows still need review', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_needs_review',
            status: 'needs_review',
            reviewDescription: 'Groceries',
            reviewCategoryId: null,
            selectedForImport: true,
          }),
        ],
      })
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(
      screen.getByText(
        'Continue prepares the selected rows for finalize import.'
      )
    ).toBeInTheDocument();
  });

  it('continues when selected rows are ready', async () => {
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            status: 'ready',
            reviewDescription: 'Coffee',
            selectedForImport: true,
          }),
        ],
      })
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(flushPendingInputs).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flushPendingInputs.mock.invocationCallOrder[0]).toBeLessThan(
      flush.mock.invocationCallOrder[0]
    );
    expect(continueMocks.mutateAsync).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(reviewRouterMocks.navigate).toHaveBeenCalledWith({
        to: '/import/$draftId/finalize',
        params: { draftId: 'draft_1' },
      })
    );
  });

  it('does not continue when persistence flush fails', async () => {
    const user = userEvent.setup();
    flush.mockResolvedValueOnce(false);
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            status: 'ready',
            reviewDescription: 'Coffee',
            selectedForImport: true,
          }),
        ],
      })
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(continueMocks.mutateAsync).not.toHaveBeenCalled();
    expect(reviewRouterMocks.navigate).not.toHaveBeenCalled();
  });

  it('disables Continue when persistence has failed', () => {
    const draft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: true,
        }),
      ],
    });
    const { rows, ...meta } = draft;
    render(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={rows}
          {...reviewSessionProps}
          autosaveStatus="failed"
          hasUnsavedWork
        />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(
      screen.getByText('Retry failed saves before continuing.')
    ).toBeInTheDocument();
  });

  it('disables Continue while review persistence is in flight', () => {
    const draft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: true,
        }),
      ],
    });
    const { rows, ...meta } = draft;
    render(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={rows}
          {...reviewSessionProps}
          autosaveStatus="saving"
          hasUnsavedWork
        />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(
      screen.getByText('Save your changes before continuing.')
    ).toBeInTheDocument();
  });

  it('shows server continue issues inline, toasts a summary, and focuses the first row', async () => {
    const user = userEvent.setup();
    continueMocks.mutateAsync.mockRejectedValue({
      error: {
        code: 'IMPORT_CONTINUE_NOT_READY',
        message: 'Some selected rows are not ready to import.',
        details: {
          rows: [
            {
              batchRowId: 'row_ready',
              key: 'import.refund_link.cumulative_exceeds',
            },
          ],
        },
      },
    });
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            status: 'ready',
            reviewDescription: 'Coffee',
            selectedForImport: true,
          }),
        ],
      })
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(reviewToastMocks.error).toHaveBeenCalledWith(
      'Linked refunds exceed the original expense amount.'
    );
    expect(screen.getByText('Fix these import issues')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Coffee: Linked refunds exceed the original expense amount.',
      })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        'id',
        'import-row-row_ready'
      )
    );
  });

  it('clears a stale continue error when autosave begins during a pending continue', () => {
    continueMocks.isPending = true;
    continueMocks.error = {
      error: {
        code: 'IMPORT_CONTINUE_NOT_READY',
        message: 'Some selected rows are not ready to import.',
      },
    };
    const readyDraft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: true,
        }),
      ],
    });
    const { rerender } = renderReview(readyDraft);
    const { rows, ...meta } = readyDraft;
    continueMocks.reset.mockClear();

    rerender(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={rows}
          {...reviewSessionProps}
          autosaveStatus="saving"
          hasUnsavedWork
        />
      </TooltipProvider>
    );

    expect(continueMocks.reset).toHaveBeenCalled();
  });

  it('renders disabled assignee toggles for invalid rows in the grid', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            status: 'ready',
            reviewDescription: 'Coffee',
            reviewAssigneeMemberIds: ['member_1'],
          }),
          makeImportDraftRow({
            id: 'row_invalid',
            rowNumber: 4,
            status: 'invalid',
            reviewDescription: 'Bad charge',
            reviewAssigneeMemberIds: ['member_1'],
            invalidReason: 'Amount must be a positive number.',
          }),
        ],
      })
    );

    const toggles = screen.getAllByTestId('member-toggle-group');
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAttribute('data-disabled', 'false');
    expect(toggles[1]).toHaveAttribute('data-disabled', 'true');
  });

  it('presents inbound finalize issues, prioritizes affected rows, and focuses the first one', async () => {
    const draft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: true,
        }),
        makeImportDraftRow({
          id: 'row_needs_review',
          rowNumber: 3,
          status: 'needs_review',
          reviewDescription: 'Groceries',
          reviewCategoryId: null,
          selectedForImport: true,
        }),
      ],
    });
    const { rows, ...meta } = draft;

    render(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={rows}
          inboundIssues={[
            {
              batchRowId: 'row_needs_review',
              key: 'transaction.category.required',
            },
          ]}
          {...reviewSessionProps}
        />
      </TooltipProvider>
    );

    expect(reviewToastMocks.error).toHaveBeenCalledWith(
      'Category is required.'
    );
    expect(screen.getByText('Fix these import issues')).toBeInTheDocument();
    const grid = screen.getByRole('table');
    const bodyRows = within(grid).getAllByRole('row').slice(1);
    expect(
      within(bodyRows[0]).getByLabelText('Description for Groceries')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        'id',
        'import-row-row_needs_review'
      )
    );
  });
});

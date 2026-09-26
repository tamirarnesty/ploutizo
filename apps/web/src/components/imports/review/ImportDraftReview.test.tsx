import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import {
  getRowExpandButtons,
  importDraftReviewTestControls,
  renderLoadingReview,
  renderReview,
  reviewSessionProps,
  setupImportDraftReviewTests,
} from './importDraftReviewTestHarness';
import { ImportDraftReview } from './ImportDraftReview';

const {
  accounts: accountsQueryMocks,
  reviewRowsById,
  reviewToast,
} = importDraftReviewTestControls;

describe('ImportDraftReview', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
  });

  it('mounts the review grid', () => {
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('keeps Continue disabled when no rows are selected', () => {
    renderReview();

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
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

  it('shows the review grid when rows need review but none are ready yet', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_needs_review',
            status: 'needs_review',
            reviewCategoryId: null,
            selectedForImport: false,
          }),
        ],
      })
    );

    expect(
      screen.queryByText('No transactions to review')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
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

  it('shows account loading instead of empty-account guidance on settlement rows', () => {
    accountsQueryMocks.data = undefined;
    accountsQueryMocks.isPending = true;
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            reviewType: 'settlement',
            reviewCategoryId: null,
            reviewCounterpartAccountId: null,
          }),
        ],
      })
    );

    expect(screen.getByText('Loading accounts…')).toBeInTheDocument();
    expect(
      screen.queryByText('Add a chequing or savings account')
    ).not.toBeInTheDocument();
  });

  it('shows a retryable accounts failure instead of empty-account guidance', async () => {
    const user = userEvent.setup();
    accountsQueryMocks.data = undefined;
    accountsQueryMocks.isError = true;
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            reviewType: 'settlement',
            reviewCategoryId: null,
            reviewCounterpartAccountId: null,
          }),
        ],
      })
    );

    expect(screen.getByText("Couldn't load accounts")).toBeInTheDocument();
    expect(
      screen.queryByText('Add a chequing or savings account')
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(accountsQueryMocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows empty-account guidance only after a successful empty accounts response', () => {
    accountsQueryMocks.data = [];
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            reviewType: 'settlement',
            reviewCategoryId: null,
            reviewCounterpartAccountId: null,
          }),
        ],
      })
    );

    expect(
      screen.getByText('Add a chequing or savings account')
    ).toBeInTheDocument();
  });

  it('renders skeleton rows matching the page size while loading', () => {
    renderLoadingReview();

    const grid = screen.getByRole('table');
    const bodyRows = within(grid).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(25);
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
    reviewRowsById.clear();
    for (const row of rows) {
      reviewRowsById.set(row.id, row);
    }

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

    expect(reviewToast.error).toHaveBeenCalledWith('Category is required.');
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

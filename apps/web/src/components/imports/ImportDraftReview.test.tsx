import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportDraftReview } from './ImportDraftReview';
import {
  DRAFT_ID,
  makeImportDraft,
  makeImportDraftRow,
} from './test-fixtures/importDraft';

const updateRow = vi.fn();
const updateRowSelectionMutate = vi.fn();

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
  MemberToggleGroup: () => <div data-testid="member-toggle-group">Toggle</div>,
}));

vi.mock('@/components/members/MemberAvatarGroup', () => ({
  MemberAvatarGroup: ({
    members,
  }: {
    members: { id: string; name: string }[];
  }) => (
    <div data-testid="member-avatar-group">
      {members.map((member) => (
        <span key={member.id} data-testid="member-avatar">
          {member.name}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('@/components/transactions/TransactionTagPicker', () => ({
  TransactionTagPicker: () => <div>Tag picker</div>,
}));

vi.mock('@/lib/data-access/imports', () => ({
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
    pagination: paginationMocks.pagination,
    setPagination: paginationMocks.setPagination,
  }),
}));

const renderReview = (draft = makeImportDraft()) => {
  const { rows, ...meta } = draft;
  return render(
    <TooltipProvider delay={0}>
      <ImportDraftReview meta={meta} rows={rows} updateRow={updateRow} />
    </TooltipProvider>
  );
};

const renderLoadingReview = () =>
  render(
    <TooltipProvider delay={0}>
      <ImportDraftReview isLoading updateRow={updateRow} />
    </TooltipProvider>
  );

const getRowExpandButtons = () =>
  screen.getAllByRole('button', { name: /details for/i });

describe('ImportDraftReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paginationMocks.pagination = { pageIndex: 0, pageSize: 25 };
  });

  it('mounts the review grid', () => {
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    expect(screen.getByRole('table')).toBeInTheDocument();
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

    expect(updateRow).toHaveBeenCalledTimes(1);
    expect(updateRow).toHaveBeenCalledWith('row_1', {
      selectedForImport: true,
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

  it('defaults needs_review rows to expanded on first render', () => {
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_needs_review',
            status: 'needs_review',
            reviewDescription: 'Groceries',
            reviewCategoryId: null,
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
    expect(updateRowSelectionMutate).toHaveBeenCalledWith({
      draftId: DRAFT_ID,
      body: {
        rowIds: ['row_a', 'row_b'],
        selectedForImport: true,
      },
    });
    expect(updateRow.mock.invocationCallOrder[0]).toBeLessThan(
      updateRowSelectionMutate.mock.invocationCallOrder[0]
    );
  });

  it('shows the continue blocker in the tooltip when rows are selected but gating fails', async () => {
    const user = userEvent.setup();
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

    expect(
      screen.queryByText('1 selected row still needs review.')
    ).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          '1 selected row still needs review. Import commit coming soon.'
        )
      ).toBeInTheDocument()
    );
  });

  it('shows read-only assignee avatars for invalid rows in the grid', () => {
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

    expect(screen.getAllByTestId('member-avatar-group')).toHaveLength(1);
    expect(screen.getByText('Tamir Arnesty')).toBeInTheDocument();
    expect(screen.getAllByTestId('member-toggle-group')).toHaveLength(1);
  });
});

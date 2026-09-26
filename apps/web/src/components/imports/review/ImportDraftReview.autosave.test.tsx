import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { importDraftFinalizeRoute } from '@/lib/navigation';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import {
  flush,
  importDraftReviewTestControls,
  renderReview,
  reviewSessionProps,
  setupImportDraftReviewTests,
} from './importDraftReviewTestHarness';
import { ImportDraftReview } from './ImportDraftReview';

const {
  continue: continueMocks,
  flushPendingInputs,
  reviewToast,
} = importDraftReviewTestControls;

describe('ImportDraftReview autosave and continue', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
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
    expect(continueMocks.continueImport).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(routerMocks.navigate).toHaveBeenCalledWith(
        importDraftFinalizeRoute('draft_1')
      )
    );
  });

  it('continues with rows selected after the review table has updated', async () => {
    const user = userEvent.setup();
    const unselectedDraft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: false,
        }),
      ],
    });
    const { rows: unselectedRows, ...meta } = unselectedDraft;
    const { rerender } = render(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={unselectedRows}
          {...reviewSessionProps}
        />
      </TooltipProvider>
    );

    const selectedDraft = makeImportDraft({
      rows: [
        makeImportDraftRow({
          id: 'row_ready',
          status: 'ready',
          reviewDescription: 'Coffee',
          selectedForImport: true,
        }),
      ],
    });
    const { rows: selectedRows } = selectedDraft;
    rerender(
      <TooltipProvider delay={0}>
        <ImportDraftReview
          meta={meta}
          rows={selectedRows}
          {...reviewSessionProps}
        />
      </TooltipProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(continueMocks.continueImport).toHaveBeenCalledWith(['row_ready']);
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

    expect(continueMocks.continueImport).not.toHaveBeenCalled();
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });

  it('disables Continue when persistence has failed', () => {
    importDraftReviewTestControls.autosaveStatus.current = 'failed';
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
        <ImportDraftReview meta={meta} rows={rows} {...reviewSessionProps} />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('disables Continue while review persistence is in flight', () => {
    importDraftReviewTestControls.autosaveStatus.current = 'saving';
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
        <ImportDraftReview meta={meta} rows={rows} {...reviewSessionProps} />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.getByText('Saving changes')).toBeInTheDocument();
  });

  it('shows server continue issues inline, toasts a summary, and focuses the first row', async () => {
    const user = userEvent.setup();
    continueMocks.continueImport.mockRejectedValue({
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

    expect(reviewToast.error).toHaveBeenCalledWith(
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

  it('does not navigate when continue is cancelled by a later review edit', async () => {
    const user = userEvent.setup();
    continueMocks.continueImport.mockResolvedValueOnce(null);
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

    expect(continueMocks.continueImport).toHaveBeenCalledTimes(1);
    expect(routerMocks.navigate).not.toHaveBeenCalled();
    expect(reviewToast.error).not.toHaveBeenCalled();
    expect(reviewToast.info).toHaveBeenCalledWith(
      'Review changed before continue finished. Try again.'
    );
  });
});

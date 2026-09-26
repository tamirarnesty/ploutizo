import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import {
  importDraftReviewTestControls,
  renderReview,
  setSelection,
  setupImportDraftReviewTests,
  updateRow,
} from './importDraftReviewTestHarness';

describe('ImportDraftReview selection', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
  });

  it('selects a row via the row checkbox', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    await user.click(screen.getByRole('checkbox', { name: 'Select Coffee' }));

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenCalledWith(['row_1'], true);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it('explains the header checkbox in a tooltip', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft({ rows: [makeImportDraftRow()] }));

    const checkbox = screen.getByRole('checkbox', {
      name: 'Select ready rows',
    });
    await user.hover(checkbox);

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="tooltip-content"]')
      ).toHaveTextContent('Select ready rows');
    });
  });

  it('selects every ready row in the draft from the header checkbox', async () => {
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
      screen.getByRole('checkbox', { name: 'Select ready rows' })
    );

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenCalledWith(['row_a', 'row_b'], true);
    expect(updateRow).not.toHaveBeenCalled();
  });

  it('selects ready rows on other pages and skips rows that are not ready', async () => {
    importDraftReviewTestControls.pagination.pagination = {
      pageIndex: 0,
      pageSize: 1,
    };
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_invalid',
            rowNumber: 1,
            status: 'invalid',
            reviewDescription: 'Broken',
            selectedForImport: false,
          }),
          makeImportDraftRow({
            id: 'row_a',
            rowNumber: 2,
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

    expect(
      screen.queryByRole('textbox', { name: 'Description for Coffee' })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('checkbox', { name: 'Select ready rows' })
    );

    expect(setSelection).toHaveBeenCalledWith(['row_a', 'row_b'], true);
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
      name: 'Select ready rows',
    });
    expect(headerCheckbox).toHaveAttribute('aria-checked', 'mixed');
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
      screen.getByRole('checkbox', { name: 'Select ready rows' })
    );

    expect(updateRow).toHaveBeenCalledWith('row_a', {
      reviewDescription: 'Updated coffee',
    });
    expect(setSelection).toHaveBeenCalledWith(['row_a', 'row_b'], true);
    expect(updateRow.mock.invocationCallOrder[0]).toBeLessThan(
      setSelection.mock.invocationCallOrder[0]
    );
  });
});

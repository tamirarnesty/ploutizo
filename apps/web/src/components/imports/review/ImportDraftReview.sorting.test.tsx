import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import {
  renderReview,
  setupImportDraftReviewTests,
} from './importDraftReviewTestHarness';

describe('ImportDraftReview sorting', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
  });

  it('sorts the draft so earlier dates come first', async () => {
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_later',
            rowNumber: 1,
            reviewDescription: 'Lunch',
            reviewDate: '2026-06-01',
            parsedDate: '2026-06-01',
          }),
          makeImportDraftRow({
            id: 'row_earlier',
            rowNumber: 2,
            reviewDescription: 'Coffee',
            reviewDate: '2026-01-01',
            parsedDate: '2026-01-01',
          }),
        ],
      })
    );

    await user.click(screen.getByRole('button', { name: 'Date' }));
    const menu = await screen.findByRole('menu');
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Oldest first' })
    );

    const descriptions = screen
      .getAllByRole('textbox', { name: /Description for/ })
      .map((input) => input.getAttribute('aria-label'));
    expect(descriptions).toEqual([
      'Description for Coffee',
      'Description for Lunch',
    ]);
  });

  it('sorts invalid rows ahead of ready rows', async () => {
    const user = userEvent.setup();
    renderReview(
      makeImportDraft({
        rows: [
          makeImportDraftRow({
            id: 'row_ready',
            rowNumber: 1,
            status: 'ready',
            reviewDescription: 'Coffee',
          }),
          makeImportDraftRow({
            id: 'row_invalid',
            rowNumber: 2,
            status: 'invalid',
            reviewDescription: 'Broken',
          }),
        ],
      })
    );

    await user.click(
      screen.getByRole('button', { name: 'Needs attention first' })
    );

    const descriptions = screen
      .getAllByRole('textbox', { name: /Description for/ })
      .map((input) => input.getAttribute('aria-label'));
    expect(descriptions[0]).toBe('Description for Broken');
  });
});

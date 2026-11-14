import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import { makeImportDraft } from '../test-fixtures/importDraft';
import {
  renderReview,
  setupImportDraftReviewTests,
} from './importDraftReviewTestHarness';

const columnHeader = (name: string) =>
  screen.getByRole('columnheader', { name });

describe('ImportDraftReview pinning', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
  });

  it('starts with the selection column pinned and keeps a later pin', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft());

    const selectionHeader = screen.getByRole('columnheader', {
      name: 'Select ready rows',
    });
    expect(selectionHeader).toHaveAttribute('data-pinned', 'start');
    expect(columnHeader('Date')).not.toHaveAttribute('data-pinned');

    await user.click(screen.getByRole('button', { name: 'Date' }));
    const menu = await screen.findByRole('menu');
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Pin to start' })
    );

    expect(columnHeader('Date')).toHaveAttribute('data-pinned', 'start');

    await user.click(screen.getByRole('button', { name: 'Unpin Date column' }));
    expect(columnHeader('Date')).not.toHaveAttribute('data-pinned');
    expect(
      screen.getByRole('columnheader', { name: 'Select ready rows' })
    ).toHaveAttribute('data-pinned', 'start');
  });
});

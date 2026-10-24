import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import { makeImportDraft } from '../test-fixtures/importDraft';
import {
  renderReview,
  setupImportDraftReviewTests,
} from './importDraftReviewTestHarness';

const columnHeader = (name: string) => {
  const control = screen.getByRole('button', { name }).closest('th');
  if (!control) {
    throw new Error(`Missing column header for ${name}`);
  }
  return control;
};

describe('ImportDraftReview pinning', () => {
  beforeEach(() => {
    resetRouterMocks();
    setupImportDraftReviewTests();
  });

  it('starts with the selection column pinned and keeps a later pin', async () => {
    const user = userEvent.setup();
    renderReview(makeImportDraft());

    const selectionHeader = screen
      .getByRole('checkbox', { name: 'Select ready rows' })
      .closest('th');
    expect(selectionHeader).toHaveAttribute('data-pinned', 'start');
    expect(columnHeader('Date')).not.toHaveAttribute('data-pinned');

    await user.click(screen.getByRole('button', { name: 'Date' }));
    const menu = await screen.findByRole('menu');
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Pin to left' })
    );

    expect(columnHeader('Date')).toHaveAttribute('data-pinned', 'start');

    await user.click(screen.getByRole('button', { name: 'Unpin Date column' }));
    expect(columnHeader('Date')).not.toHaveAttribute('data-pinned');
    expect(
      screen.getByRole('checkbox', { name: 'Select ready rows' }).closest('th')
    ).toHaveAttribute('data-pinned', 'start');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  markImportReviewSelectionFailure,
  markImportReviewSelectionStart,
  markImportReviewSelectionSuccess,
  resetImportReviewAutosaveForTests,
  subscribeImportReviewUserEdits,
} from './importReviewAutosave';

describe('importReviewAutosave selection failures', () => {
  afterEach(() => {
    resetImportReviewAutosaveForTests();
  });

  it('notifies listeners when a new review edit is queued', () => {
    const draftId = 'draft_1';
    const listener = vi.fn();

    const unsubscribe = subscribeImportReviewUserEdits(draftId, listener);
    markImportReviewPending(draftId, 'row_a');

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    markImportReviewPending(draftId, 'row_b');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies listeners when selection persistence starts', () => {
    const draftId = 'draft_1';
    const listener = vi.fn();
    const unsubscribe = subscribeImportReviewUserEdits(draftId, listener);

    markImportReviewSelectionStart(draftId);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('accumulates failed selection row ids across bulk failures', () => {
    const draftId = 'draft_1';

    markImportReviewSelectionStart(draftId);
    markImportReviewSelectionFailure(draftId, ['row_a']);

    markImportReviewSelectionStart(draftId);
    markImportReviewSelectionFailure(draftId, ['row_b']);

    const snapshot = getImportReviewAutosaveSnapshot(draftId);
    expect(snapshot.status).toBe('failed');
    expect(snapshot.failedSelectionRowIds).toEqual(
      expect.arrayContaining(['row_a', 'row_b'])
    );
    expect(snapshot.failedRowIds).toEqual(
      expect.arrayContaining(['row_a', 'row_b'])
    );
  });

  it('clears only succeeded rows from failed selection tracking', () => {
    const draftId = 'draft_1';

    markImportReviewSelectionStart(draftId);
    markImportReviewSelectionFailure(draftId, ['row_a', 'row_b']);

    markImportReviewSelectionStart(draftId);
    markImportReviewSelectionSuccess(draftId, ['row_a']);

    const snapshot = getImportReviewAutosaveSnapshot(draftId);
    expect(snapshot.failedSelectionRowIds).toEqual(['row_b']);
    expect(snapshot.failedRowIds).toEqual(['row_b']);
  });
});

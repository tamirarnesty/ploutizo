import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  markImportReviewPersistFailureMany,
  markImportReviewPersistStartMany,
  subscribeImportReviewAutosave,
  subscribeImportReviewAutosaveFailure,
} from './importReviewAutosave';

describe('importReviewAutosave', () => {
  afterEach(() => {
    endImportReviewAutosave();
  });

  it('notifies autosave listeners when a new review edit is queued', () => {
    const draftId = 'draft_1';
    const listener = vi.fn();

    const unsubscribe = subscribeImportReviewAutosave(draftId, listener);
    markImportReviewPending(draftId, 'row_a');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('saving');

    unsubscribe();
    markImportReviewPending(draftId, 'row_b');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies failure listeners only when status newly becomes failed', () => {
    const draftId = 'draft_1';
    const failureListener = vi.fn();

    const listener = vi.fn();
    const unsubscribeStatus = subscribeImportReviewAutosave(draftId, listener);
    const unsubscribe = subscribeImportReviewAutosaveFailure(
      draftId,
      failureListener
    );

    markImportReviewPersistStartMany(draftId, ['row_a', 'row_b']);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(failureListener).not.toHaveBeenCalled();

    markImportReviewPersistFailureMany(draftId, [
      { rowId: 'row_a', fieldKeys: ['reviewDescription'] },
      { rowId: 'row_b', fieldKeys: ['reviewDescription'] },
    ]);

    expect(failureListener).toHaveBeenCalledTimes(1);
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('failed');
    expect(getImportReviewAutosaveSnapshot(draftId).failedRowIds).toEqual([
      'row_a',
      'row_b',
    ]);

    markImportReviewPersistFailureMany(draftId, [
      { rowId: 'row_b', fieldKeys: ['reviewDescription'] },
    ]);
    expect(failureListener).toHaveBeenCalledTimes(1);

    unsubscribeStatus();
    unsubscribe();
  });
});

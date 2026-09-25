import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
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

    const unsubscribe = subscribeImportReviewAutosaveFailure(
      draftId,
      failureListener
    );

    markImportReviewPersistStart(draftId, 'row_a');
    markImportReviewPersistFailure(draftId, 'row_a', ['reviewDescription']);

    expect(failureListener).toHaveBeenCalledTimes(1);
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('failed');

    markImportReviewPersistFailure(draftId, 'row_b', ['reviewDescription']);
    expect(failureListener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});

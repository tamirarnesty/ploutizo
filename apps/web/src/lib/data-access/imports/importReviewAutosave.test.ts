import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
  markImportReviewPending,
  subscribeImportReviewAutosave,
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
    expect(getImportReviewAutosaveSnapshot(draftId).status).toBe('pending');

    unsubscribe();
    markImportReviewPending(draftId, 'row_b');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

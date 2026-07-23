import { afterEach, describe, expect, it } from 'vitest';
import {
  getImportReviewAutosaveSnapshot,
  markImportReviewSelectionFailure,
  markImportReviewSelectionStart,
  markImportReviewSelectionSuccess,
  resetImportReviewAutosaveForTests,
} from './importReviewAutosave';

describe('importReviewAutosave selection failures', () => {
  afterEach(() => {
    resetImportReviewAutosaveForTests();
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

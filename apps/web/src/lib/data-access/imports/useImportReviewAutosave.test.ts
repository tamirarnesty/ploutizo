import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  endImportReviewAutosave,
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
} from './importReviewAutosave';
import { useImportReviewAutosaveRowFailed } from './useImportReviewAutosave';

describe('useImportReviewAutosaveRowFailed', () => {
  afterEach(() => {
    endImportReviewAutosave();
  });

  it('returns true only for rows in the failed set', () => {
    const draftId = 'draft_1';
    const { result, rerender } = renderHook(() =>
      useImportReviewAutosaveRowFailed(draftId, 'row_a')
    );

    expect(result.current).toBe(false);

    markImportReviewPersistStart(draftId, 'row_a');
    markImportReviewPersistFailure(draftId, 'row_a', ['reviewDescription']);
    rerender();

    expect(result.current).toBe(true);
  });
});

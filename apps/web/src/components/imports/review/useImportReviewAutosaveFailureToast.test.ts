import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  endImportReviewAutosave,
  markImportReviewPersistFailure,
  markImportReviewPersistStart,
} from '@/lib/data-access/imports/importReviewAutosave';
import {
  IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
  useImportReviewAutosaveFailureToast,
} from './useImportReviewAutosaveFailureToast';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    error: toastError,
  },
}));

describe('useImportReviewAutosaveFailureToast', () => {
  afterEach(() => {
    endImportReviewAutosave();
    toastError.mockClear();
  });

  it('toasts once when persistence newly fails', () => {
    const draftId = 'draft_1';
    const retryAutosave = vi.fn();

    renderHook(() =>
      useImportReviewAutosaveFailureToast({ draftId, retryAutosave })
    );

    markImportReviewPersistStart(draftId, 'row_a');
    markImportReviewPersistFailure(draftId, 'row_a', ['reviewDescription']);

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Could not save changes.', {
      id: IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
      action: {
        label: 'Retry',
        onClick: expect.any(Function) as () => void,
      },
    });

    toastError.mock.calls[0]?.[1]?.action?.onClick();
    expect(retryAutosave).toHaveBeenCalledTimes(1);

    markImportReviewPersistFailure(draftId, 'row_b', ['reviewDescription']);
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});

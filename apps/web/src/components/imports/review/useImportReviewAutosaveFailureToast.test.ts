import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewPersistenceStatus } from '@/lib/data-access/imports/reviewPersistence';
import {
  IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
  useImportReviewAutosaveFailureToast,
} from './useImportReviewAutosaveFailureToast';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('@ploutizo/ui/components/sonner-api', () => ({
  toast: {
    error: toastError,
    dismiss: vi.fn(),
  },
}));

/** A controllable Review persistence status feed. */
const feed = vi.hoisted(() => ({
  status: 'idle' as ReviewPersistenceStatus,
  listeners: new Set<() => void>(),
}));

const setStatus = (status: ReviewPersistenceStatus) => {
  feed.status = status;
  for (const listener of feed.listeners) listener();
};

vi.mock('@/lib/data-access/imports/reviewPersistence', () => ({
  getReviewPersistence: () => ({
    getSnapshot: () => ({ status: feed.status }),
    subscribe: (listener: () => void) => {
      feed.listeners.add(listener);
      return () => feed.listeners.delete(listener);
    },
  }),
}));

vi.mock('@/lib/data-access/imports/useImportReviewAutosave', () => ({
  useImportReviewAutosaveStatus: () => feed.status,
}));

describe('useImportReviewAutosaveFailureToast', () => {
  afterEach(() => {
    feed.status = 'idle';
    feed.listeners.clear();
    toastError.mockClear();
  });

  it('toasts once when persistence newly fails', () => {
    const retryAutosave = vi.fn();

    renderHook(() =>
      useImportReviewAutosaveFailureToast({
        draftId: 'draft_1',
        retryAutosave,
      })
    );

    act(() => setStatus('saving'));
    act(() => setStatus('failed'));

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(
      'Could not save changes. Check your connection and retry.',
      {
        id: IMPORT_REVIEW_AUTOSAVE_FAILED_TOAST_ID,
        duration: Infinity,
        action: {
          label: 'Retry',
          onClick: expect.any(Function) as () => void,
        },
      }
    );

    toastError.mock.calls[0]?.[1]?.action?.onClick();
    expect(retryAutosave).toHaveBeenCalledTimes(1);

    act(() => setStatus('failed'));
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});

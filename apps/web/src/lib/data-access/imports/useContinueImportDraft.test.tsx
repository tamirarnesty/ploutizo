import '@/lib/access/working-set-cleanup';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportFinalizePreview } from '@ploutizo/validators';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';

import { fetchContinueImportDraft } from './fetchContinueImportDraft';
import { useContinueImportDraft } from './useContinueImportDraft';

vi.mock('@/lib/access/access-context', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@ploutizo/ui/components/sonner-api', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('./fetchContinueImportDraft', () => ({
  fetchContinueImportDraft: vi.fn(),
}));

/** Stands in for Review persistence: tests decide when new edits begin saving. */
const persistence = vi.hoisted(() => ({
  controller: undefined as AbortController | undefined,
}));

vi.mock('./reviewPersistence', () => ({
  getReviewPersistence: () => ({
    signalUntilDirty: () => {
      persistence.controller = new AbortController();
      return persistence.controller.signal;
    },
  }),
}));

const preview: ImportFinalizePreview = {
  batchId: 'draft_1',
  rowCount: 1,
  counts: { created: 1, matched: 0, skipped: 0, invalid: 0 },
  created: [],
  matched: [],
};

const rowIds = ['row_1'];

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useContinueImportDraft', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    toastSuccess.mockReset();
    vi.mocked(fetchContinueImportDraft).mockReset();
    persistence.controller = undefined;
  });

  it('resolves the preview when continue succeeds without later review changes', async () => {
    vi.mocked(fetchContinueImportDraft).mockResolvedValue(preview);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await expect(result.current.continueImport(rowIds)).resolves.toEqual(
        preview
      );
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(preview);
    });
    expect(fetchContinueImportDraft).toHaveBeenCalledWith(
      'draft_1',
      rowIds,
      expect.any(AbortSignal)
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('returns null without an error when new edits begin saving before continue settles', async () => {
    const pending = deferred<ImportFinalizePreview>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportFinalizePreview | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport(rowIds);
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      persistence.controller?.abort();
    });

    await act(async () => {
      pending.resolve(preview);
      await expect(continuePromise).resolves.toBeNull();
    });

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('shows no error when the aborted request rejects', async () => {
    const pending = deferred<ImportFinalizePreview>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportFinalizePreview | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport(rowIds);
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      persistence.controller?.abort();
    });

    await act(async () => {
      pending.reject({
        error: {
          code: 'IMPORT_CONTINUE_NOT_READY',
          message: 'Some selected rows are not ready to import.',
        },
      });
      await expect(continuePromise).resolves.toBeNull();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('still surfaces a real continue error', async () => {
    const error = {
      error: {
        code: 'IMPORT_CONTINUE_NOT_READY',
        message: 'Some selected rows are not ready to import.',
      },
    };
    vi.mocked(fetchContinueImportDraft).mockRejectedValue(error);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await expect(result.current.continueImport(rowIds)).rejects.toEqual(
        error
      );
    });
  });
});

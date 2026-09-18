import '@/lib/access/working-set-cleanup';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPreparedSetSummary } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';

import { markImportReviewPending } from './importReviewAutosave';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';
import { useContinueImportDraft } from './useContinueImportDraft';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('./fetchContinueImportDraft', () => ({
  fetchContinueImportDraft: vi.fn(),
}));

const preparedSet: ImportPreparedSetSummary = {
  id: 'prepared_1',
  batchId: 'draft_1',
  revision: 3,
  createdAt: '2026-05-20T12:00:00.000Z',
};

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
  });

  it('resolves the prepared set when continue succeeds without later review changes', async () => {
    vi.mocked(fetchContinueImportDraft).mockResolvedValue(preparedSet);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    await act(async () => {
      await result.current.continueImport();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(preparedSet);
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('returns null when the user edits the review before continue settles', async () => {
    const pending = deferred<ImportPreparedSetSummary>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportPreparedSetSummary | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport();
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      markImportReviewPending('draft_1', 'row_1');
    });

    await act(async () => {
      pending.resolve(preparedSet);
      await expect(continuePromise).resolves.toBeNull();
    });

    expect(toastSuccess).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('does not toast when the review changes before continue settles', async () => {
    const pending = deferred<ImportPreparedSetSummary>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportPreparedSetSummary | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport();
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      result.current.reset();
    });

    await act(async () => {
      pending.resolve(preparedSet);
      await expect(continuePromise).resolves.toBeNull();
    });

    expect(toastSuccess).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('does not toast when the request is aborted before continue settles', async () => {
    const pending = deferred<ImportPreparedSetSummary>();
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(fetchContinueImportDraft).mockImplementation(
      (_draftId, signal) => {
        capturedSignal = signal;
        return pending.promise;
      }
    );
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportPreparedSetSummary | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport();
    });
    await waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });

    act(() => {
      result.current.reset();
    });
    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(preparedSet);
      await expect(continuePromise).resolves.toBeNull();
    });

    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('does not keep a stale continue error after the review changes', async () => {
    const pending = deferred<ImportPreparedSetSummary>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper: HouseholdHookWrapper,
    });

    let continuePromise: Promise<ImportPreparedSetSummary | null> | undefined;
    act(() => {
      continuePromise = result.current.continueImport();
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      result.current.reset();
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

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

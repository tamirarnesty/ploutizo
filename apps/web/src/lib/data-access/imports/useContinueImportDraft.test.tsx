import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportPreparedSet } from '@ploutizo/types';
import { queryClient } from '@/lib/queryClient';
import { fetchContinueImportDraft } from './fetchContinueImportDraft';
import { useContinueImportDraft } from './useContinueImportDraft';
import type { ReactNode } from 'react';

const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('./fetchContinueImportDraft', () => ({
  fetchContinueImportDraft: vi.fn(),
}));

const preparedSet: ImportPreparedSet = {
  id: 'prepared_1',
  batchId: 'draft_1',
  revision: 3,
  createdAt: '2026-05-20T12:00:00.000Z',
  outcomes: [],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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
    queryClient.clear();
    toastSuccess.mockReset();
    vi.mocked(fetchContinueImportDraft).mockReset();
  });

  it('toasts when continue succeeds without later review changes', async () => {
    vi.mocked(fetchContinueImportDraft).mockResolvedValue(preparedSet);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(toastSuccess).toHaveBeenCalledWith(
      'Prepared revision 3 for finalize.'
    );
  });

  it('does not toast when the review changes before continue settles', async () => {
    const pending = deferred<ImportPreparedSet>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper,
    });

    let continuePromise: Promise<ImportPreparedSet> | undefined;
    act(() => {
      continuePromise = result.current.mutateAsync();
    });
    await waitFor(() => {
      expect(fetchContinueImportDraft).toHaveBeenCalled();
    });

    act(() => {
      result.current.reset();
    });

    await act(async () => {
      pending.resolve(preparedSet);
      await continuePromise?.catch(() => undefined);
    });

    expect(toastSuccess).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('does not toast when the request is aborted before continue settles', async () => {
    const pending = deferred<ImportPreparedSet>();
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(fetchContinueImportDraft).mockImplementation(
      (_draftId, signal) => {
        capturedSignal = signal;
        return pending.promise;
      }
    );
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper,
    });

    let continuePromise: Promise<ImportPreparedSet> | undefined;
    act(() => {
      continuePromise = result.current.mutateAsync();
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
      await continuePromise?.catch(() => undefined);
    });

    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('does not keep a stale continue error after the review changes', async () => {
    const pending = deferred<ImportPreparedSet>();
    vi.mocked(fetchContinueImportDraft).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useContinueImportDraft('draft_1'), {
      wrapper,
    });

    let continuePromise: Promise<ImportPreparedSet> | undefined;
    act(() => {
      continuePromise = result.current.mutateAsync();
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
      await continuePromise?.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

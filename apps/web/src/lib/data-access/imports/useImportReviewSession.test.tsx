import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import {
  IMPORT_ROW_PACE_WAIT_MS,
  resetImportDraftRowPacedMutationsForTests,
} from './getImportDraftRowPacedMutations';
import { resetImportDraftRowsCollectionsForTests } from './getImportDraftRowsCollection';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';
import { fetchImportDraft } from './useGetImportDraft';
import { useImportReviewSession } from './useImportReviewSession';
import type { ReactNode } from 'react';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

vi.mock('./fetchUpdateImportDraftRow', () => ({
  fetchUpdateImportDraftRow: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_session_1',
  accountName: 'Amex',
  fileName: 'amex.csv',
  rows: [
    makeImportDraftRow({
      id: 'row_ready',
      rowNumber: 2,
      reviewDescription: 'Coffee',
    }),
    makeImportDraftRow({
      id: 'row_b',
      rowNumber: 3,
      reviewDescription: 'Groceries',
      reviewCategoryId: null,
      status: 'needs_review',
    }),
  ],
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const hydrateSession = async () => {
  const hook = renderHook(() => useImportReviewSession('draft_session_1'), {
    wrapper,
  });
  await waitFor(() => {
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.meta).toBeDefined();
  });
  return hook;
};

describe('useImportReviewSession', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    vi.mocked(fetchUpdateImportDraftRow).mockReset();
    vi.mocked(fetchUpdateImportDraftRow).mockImplementation((rowId, body) => {
      const row = draft.rows.find((entry) => entry.id === rowId);
      if (!row) return Promise.reject(new Error(`missing row ${rowId}`));
      return Promise.resolve({
        ...row,
        ...body,
        updatedAt: '2026-05-20T12:00:01.000Z',
      });
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    resetImportDraftRowPacedMutationsForTests();
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('hydrates slim draft meta and live rows from one draft GET', async () => {
    const { result, unmount } = await hydrateSession();

    expect(fetchImportDraft).toHaveBeenCalledTimes(1);
    expect(fetchImportDraft).toHaveBeenCalledWith('draft_session_1');

    expect(result.current.meta).toMatchObject({
      id: 'draft_session_1',
      accountName: 'Amex',
      fileName: 'amex.csv',
      rowCount: 2,
    });
    expect(result.current.meta).not.toHaveProperty('rows');

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows.map((row) => row.id)).toEqual([
      'row_ready',
      'row_b',
    ]);
    expect(result.current.rows[0]?.reviewDescription).toBe('Coffee');
    expect(result.current.isError).toBe(false);
    unmount();
  });

  it('releases the session collection on unmount so remount can re-hydrate', async () => {
    const { unmount } = await hydrateSession();
    unmount();

    const { result, unmount: unmountAgain } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.meta?.id).toBe('draft_session_1');
      expect(result.current.rows).toHaveLength(2);
    });
    // Warm Query cache may satisfy the remount; collection is a fresh session instance.
    expect(result.current.isError).toBe(false);
    unmountAgain();
  });

  it('exposes error state when the draft GET fails', async () => {
    vi.mocked(fetchImportDraft).mockRejectedValue(new Error('not found'));

    const { result, unmount } = renderHook(
      () => useImportReviewSession('missing_draft'),
      { wrapper }
    );

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.meta).toBeUndefined();
    expect(result.current.rows).toEqual([]);
    unmount();
  });

  it('updates live rows immediately through the working-copy write API', async () => {
    const { result, unmount } = await hydrateSession();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Coffee Shop',
      });
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Coffee Shop');
    expect(fetchUpdateImportDraftRow).not.toHaveBeenCalled();
    unmount();
  });

  it('debounces and merges same-row bursts into one row PATCH', async () => {
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Coff' });
      result.current.updateRow('row_ready', {
        reviewDescription: 'Coffee Shop',
      });
      result.current.updateRow('row_ready', {
        reviewCategoryId: 'cat_2',
      });
    });

    expect(fetchUpdateImportDraftRow).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledTimes(1);
    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_ready', {
      reviewDescription: 'Coffee Shop',
      reviewCategoryId: 'cat_2',
    });
    unmount();
  });

  it('keeps per-row paced queues isolated across rows', async () => {
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Coffee Shop',
      });
      result.current.updateRow('row_b', {
        reviewDescription: 'Market',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledTimes(2);
    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_ready', {
      reviewDescription: 'Coffee Shop',
    });
    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_b', {
      reviewDescription: 'Market',
    });
    unmount();
  });

  it('keeps live edits when persist fails', async () => {
    vi.mocked(fetchUpdateImportDraftRow).mockRejectedValue(
      new Error('network')
    );
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Kept locally',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledTimes(1);
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Kept locally');
    unmount();
  });

  it('does not let an older failed persist overwrite a newer same-row value', async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const firstPersist = new Promise<never>((_resolve, reject) => {
      rejectFirst = reject;
    });
    let resolveSecond:
      | ((row: ReturnType<typeof makeImportDraftRow>) => void)
      | undefined;
    const secondPersist = new Promise<ReturnType<typeof makeImportDraftRow>>(
      (resolve) => {
        resolveSecond = resolve;
      }
    );

    vi.mocked(fetchUpdateImportDraftRow)
      .mockImplementationOnce(() => firstPersist)
      .mockImplementationOnce(() => secondPersist);

    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Older' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Newer' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledTimes(2);
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Newer');

    await act(async () => {
      rejectFirst?.(new Error('stale network'));
      await firstPersist.catch(() => undefined);
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Newer');

    await act(async () => {
      resolveSecond?.({
        ...draft.rows[0],
        reviewDescription: 'Newer',
        updatedAt: '2026-05-20T12:00:02.000Z',
      });
      await secondPersist;
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Newer');
    unmount();
  });
});

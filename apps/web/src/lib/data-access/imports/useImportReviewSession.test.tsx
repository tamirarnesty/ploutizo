import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateImportDraftRowResult } from '@ploutizo/types';
import {
  makeImportDraft,
  makeImportDraftRow,
  toPersistedImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import {
  IMPORT_ROW_PACE_WAIT_MS,
  resetImportDraftRowPacedMutationsForTests,
} from './getImportDraftRowPacedMutations';
import { resetImportDraftRowsCollectionsForTests } from './getImportDraftRowsCollection';
import { resetImportReviewAutosaveForTests } from './importReviewAutosave';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';
import { fetchUpdateImportDraftRowSelection } from './fetchUpdateImportDraftRowSelection';
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

vi.mock('./fetchUpdateImportDraftRowSelection', () => ({
  fetchUpdateImportDraftRowSelection: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_session_1',
  account: {
    id: 'acct_amex',
    name: 'Amex',
    institutionId: 'amex',
    lastFour: '5678',
  },
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
        row: toPersistedImportDraftRow(row, {
          ...body,
          updatedAt: '2026-05-20T12:00:01.000Z',
        }),
      } satisfies UpdateImportDraftRowResult);
    });
    vi.mocked(fetchUpdateImportDraftRowSelection).mockReset();
    vi.mocked(fetchUpdateImportDraftRowSelection).mockImplementation(
      (_draftId, body) => {
        const rows = draft.rows
          .filter((row) => body.rowIds.includes(row.id))
          .map((row) =>
            toPersistedImportDraftRow(row, {
              selectedForImport: body.selectedForImport,
              updatedAt: '2026-05-20T12:00:01.000Z',
            })
          );
        return Promise.resolve(rows);
      }
    );
  });

  afterEach(async () => {
    vi.useRealTimers();
    resetImportDraftRowPacedMutationsForTests();
    resetImportReviewAutosaveForTests();
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('hydrates slim draft meta and live rows from one draft GET', async () => {
    const { result, unmount } = await hydrateSession();

    expect(fetchImportDraft).toHaveBeenCalledTimes(1);
    expect(fetchImportDraft).toHaveBeenCalledWith('draft_session_1');

    expect(result.current.meta).toMatchObject({
      id: 'draft_session_1',
      account: {
        id: 'acct_amex',
        name: 'Amex',
        institutionId: 'amex',
        lastFour: '5678',
      },
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
      | ((result: UpdateImportDraftRowResult) => void)
      | undefined;
    const secondPersist = new Promise<UpdateImportDraftRowResult>((resolve) => {
      resolveSecond = resolve;
    });

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
      const readyRow = draft.rows.find((row) => row.id === 'row_ready');
      if (!readyRow) throw new Error('missing row_ready');
      resolveSecond?.({
        row: toPersistedImportDraftRow(readyRow, {
          reviewDescription: 'Newer',
          updatedAt: '2026-05-20T12:00:02.000Z',
        }),
      });
      await secondPersist;
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Newer');
    unmount();
  });

  it('updates selection on the collection immediately and persists via bulk API', async () => {
    const staleReadyDraft = {
      ...draft,
      rows: draft.rows.map((row) =>
        row.id === 'row_ready'
          ? {
              ...row,
              status: 'needs_review' as const,
              invalidReason: 'stale persisted status',
            }
          : row
      ),
    };
    vi.mocked(fetchImportDraft).mockResolvedValue(staleReadyDraft);
    const { result, unmount } = await hydrateSession();

    act(() => {
      result.current.setSelection(['row_ready', 'row_b'], true);
    });

    expect(result.current.rows.every((row) => row.selectedForImport)).toBe(
      true
    );
    expect(fetchUpdateImportDraftRow).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fetchUpdateImportDraftRowSelection).toHaveBeenCalledTimes(1);
    });

    expect(fetchUpdateImportDraftRowSelection).toHaveBeenCalledWith(
      'draft_session_1',
      {
        rowIds: ['row_ready', 'row_b'],
        selectedForImport: true,
      }
    );
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
    ).toMatchObject({
      selectedForImport: true,
      status: 'ready',
      invalidReason: null,
    });
    unmount();
  });

  it('keeps every failed bulk selection retryable after consecutive failures', async () => {
    const pendingSelectionFailures = new Set(['row_ready|true', 'row_b|true']);
    vi.mocked(fetchUpdateImportDraftRowSelection).mockImplementation(
      (_draftId, body) => {
        const key = `${body.rowIds.slice().sort().join(',')}|${body.selectedForImport}`;
        if (pendingSelectionFailures.has(key)) {
          pendingSelectionFailures.delete(key);
          return Promise.reject(new Error('network'));
        }
        return Promise.resolve(
          draft.rows
            .filter((row) => body.rowIds.includes(row.id))
            .map((row) => ({
              ...row,
              selectedForImport: body.selectedForImport,
              updatedAt: '2026-05-20T12:00:01.000Z',
            }))
        );
      }
    );

    const { result, unmount } = await hydrateSession();

    act(() => {
      result.current.setSelection(['row_ready'], true);
    });

    await waitFor(() => {
      expect(result.current.autosaveStatus).toBe('failed');
    });

    act(() => {
      result.current.setSelection(['row_b'], true);
    });

    await waitFor(() => {
      expect(result.current.failedRowIds).toEqual(
        expect.arrayContaining(['row_ready', 'row_b'])
      );
    });

    let flushOk = true;
    await act(async () => {
      flushOk = await result.current.flush();
    });
    expect(flushOk).toBe(false);
    expect(result.current.hasUnsavedWork).toBe(true);
    unmount();
  });

  it('flushes pending field persists before bulk selection', async () => {
    const callOrder: string[] = [];
    vi.mocked(fetchUpdateImportDraftRow).mockImplementation((rowId, body) => {
      callOrder.push('row');
      const row = draft.rows.find((entry) => entry.id === rowId);
      if (!row) return Promise.reject(new Error(`missing row ${rowId}`));
      return Promise.resolve({
        row: toPersistedImportDraftRow(row, {
          ...body,
          updatedAt: '2026-05-20T12:00:01.000Z',
        }),
      });
    });
    vi.mocked(fetchUpdateImportDraftRowSelection).mockImplementation(
      (_draftId, body) => {
        callOrder.push('selection');
        return Promise.resolve(
          draft.rows
            .filter((row) => body.rowIds.includes(row.id))
            .map((row) =>
              toPersistedImportDraftRow(row, {
                selectedForImport: body.selectedForImport,
                updatedAt: '2026-05-20T12:00:01.000Z',
              })
            )
        );
      }
    );

    const { result, unmount } = await hydrateSession();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Before select',
      });
    });

    expect(fetchUpdateImportDraftRow).not.toHaveBeenCalled();

    act(() => {
      result.current.setSelection(['row_ready'], true);
    });

    await waitFor(() => {
      expect(callOrder).toEqual(['row', 'selection']);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_ready', {
      reviewDescription: 'Before select',
    });
    expect(fetchUpdateImportDraftRowSelection).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('surfaces draft autosave Saving → Saved and Failed · Retry', async () => {
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    expect(result.current.autosaveStatus).toBe('idle');

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Autosave me',
      });
    });

    expect(result.current.autosaveStatus).toBe('saving');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(result.current.autosaveStatus).toBe('saved');

    vi.mocked(fetchUpdateImportDraftRow).mockRejectedValueOnce(
      new Error('network')
    );

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Will fail',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(result.current.autosaveStatus).toBe('failed');
    expect(result.current.failedRowIds).toContain('row_ready');
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Will fail');
    unmount();
  });

  it('marks unsaved work while saving and clears it after a successful flush', async () => {
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Still pending',
      });
    });

    expect(result.current.hasUnsavedWork).toBe(true);
    expect(result.current.autosaveStatus).toBe('saving');

    let flushOk = false;
    await act(async () => {
      flushOk = await result.current.flush();
    });

    expect(flushOk).toBe(true);
    expect(result.current.hasUnsavedWork).toBe(false);
    expect(result.current.autosaveStatus).toBe('saved');
    unmount();
  });

  it('blocks flush while Failed remains and allows proceed after successful retry', async () => {
    vi.mocked(fetchUpdateImportDraftRow).mockRejectedValueOnce(
      new Error('network')
    );
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Retry me',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(result.current.autosaveStatus).toBe('failed');
    vi.useRealTimers();

    let flushOk = true;
    await act(async () => {
      flushOk = await result.current.flush();
    });
    expect(flushOk).toBe(false);
    expect(result.current.hasUnsavedWork).toBe(true);

    vi.mocked(fetchUpdateImportDraftRow).mockImplementation((rowId, body) => {
      const row = draft.rows.find((entry) => entry.id === rowId);
      if (!row) return Promise.reject(new Error(`missing row ${rowId}`));
      return Promise.resolve({
        row: toPersistedImportDraftRow(row, {
          ...body,
          updatedAt: '2026-05-20T12:00:02.000Z',
        }),
      });
    });

    act(() => {
      result.current.retryAutosave();
    });

    await waitFor(() => {
      expect(result.current.autosaveStatus).toBe('saved');
    });

    await act(async () => {
      flushOk = await result.current.flush();
    });
    expect(flushOk).toBe(true);
    expect(result.current.hasUnsavedWork).toBe(false);
    unmount();
  });

  it('re-persists prior failed fields on the next edit and only then clears Failed', async () => {
    vi.mocked(fetchUpdateImportDraftRow).mockRejectedValueOnce(
      new Error('network')
    );
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', {
        reviewCategoryId: 'cat_failed',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(result.current.autosaveStatus).toBe('failed');
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewCategoryId
    ).toBe('cat_failed');

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'After failure',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenLastCalledWith('row_ready', {
      reviewCategoryId: 'cat_failed',
      reviewDescription: 'After failure',
    });
    expect(result.current.autosaveStatus).toBe('saved');
    expect(result.current.failedRowIds).not.toContain('row_ready');
    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
    ).toMatchObject({
      reviewCategoryId: 'cat_failed',
      reviewDescription: 'After failure',
    });
    unmount();
  });

  it('derives import row status from the live collection during the session', async () => {
    const { result, unmount } = await hydrateSession();

    expect(result.current.rows.find((row) => row.id === 'row_b')?.status).toBe(
      'needs_review'
    );

    act(() => {
      result.current.updateRow('row_b', {
        reviewCategoryId: 'cat_1',
      });
    });

    expect(result.current.rows.find((row) => row.id === 'row_b')?.status).toBe(
      'ready'
    );
    unmount();
  });

  it('does not let a stale success overwrite a reverted same-row value', async () => {
    let resolveFirst:
      | ((result: UpdateImportDraftRowResult) => void)
      | undefined;
    const firstPersist = new Promise<UpdateImportDraftRowResult>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetchUpdateImportDraftRow).mockImplementationOnce(
      () => firstPersist
    );

    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Attempt B' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Coffee' });
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Coffee');

    await act(async () => {
      const readyRow = draft.rows.find((row) => row.id === 'row_ready');
      if (!readyRow) throw new Error('missing row_ready');
      resolveFirst?.({
        row: toPersistedImportDraftRow(readyRow, {
          reviewDescription: 'Attempt B',
          updatedAt: '2026-05-20T12:00:02.000Z',
        }),
      });
      await firstPersist;
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Coffee');
    unmount();
  });

  it('keeps refund-link needs_review after a non-refund field PATCH', async () => {
    const expenseId = 'expense_wrong_account';
    const refundDraft = makeImportDraft({
      id: 'draft_session_1',
      account: {
        id: 'acct_amex',
        name: 'Amex',
        institutionId: 'amex',
        lastFour: '5678',
      },
      fileName: 'amex.csv',
      refundTargetFacts: {
        [expenseId]: {
          id: expenseId,
          accountId: 'other_acct',
          amount: 5000,
          categoryId: 'cat_1',
          assigneeMemberIds: ['member_1'],
          type: 'expense',
          deleted: false,
        },
      },
      rows: [
        makeImportDraftRow({
          id: 'row_refund',
          reviewType: 'refund',
          parsedType: 'refund',
          reviewAmount: 1000,
          parsedAmount: 1000,
          reviewRefundOf: expenseId,
          reviewCategoryId: null,
          status: 'needs_review',
          selectedForImport: true,
        }),
      ],
    });
    vi.mocked(fetchImportDraft).mockResolvedValue(refundDraft);
    vi.mocked(fetchUpdateImportDraftRow).mockImplementation((rowId, body) => {
      const row = refundDraft.rows.find((entry) => entry.id === rowId);
      if (!row) return Promise.reject(new Error(`missing row ${rowId}`));
      return Promise.resolve({
        row: toPersistedImportDraftRow(row, {
          ...body,
          updatedAt: '2026-05-20T12:00:01.000Z',
        }),
      } satisfies UpdateImportDraftRowResult);
    });

    const { result, unmount } = await hydrateSession();
    expect(
      result.current.rows.find((row) => row.id === 'row_refund')?.status
    ).toBe('needs_review');

    vi.useFakeTimers();
    act(() => {
      result.current.updateRow('row_refund', {
        reviewCategoryId: 'cat_2',
      });
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_refund')?.status
    ).toBe('needs_review');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_refund', {
      reviewCategoryId: 'cat_2',
    });
    expect(
      result.current.rows.find((row) => row.id === 'row_refund')?.status
    ).toBe('needs_review');
    expect(
      result.current.rows.find((row) => row.id === 'row_refund')
        ?.reviewCategoryId
    ).toBe('cat_2');
    unmount();
  });
});

import '@/lib/access/working-set-cleanup';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchUpdateImportDraftRowsResult } from '@ploutizo/types';
import {
  makeImportDraft,
  makeImportDraftRow,
  toPersistedImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import '@/test/mockTanstackRouter';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';

import {
  IMPORT_DRAFT_PACE_WAIT_MS,
  endImportDraftPacedMutations,
} from './getImportDraftPacedMutations';
import { endImportDraftRowsCollections } from './getImportDraftRowsCollection';
import { endImportDraftPersistBaselines } from './importDraftPersistBaselines';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
} from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { fetchImportDraft } from './useGetImportDraft';
import { useImportReviewSession } from './useImportReviewSession';
import type * as useGetImportDraftModule from './useGetImportDraft';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

vi.mock('./useGetImportDraft', async (importOriginal) => {
  const actual = await importOriginal<typeof useGetImportDraftModule>();
  return {
    ...actual,
    fetchImportDraft: vi.fn(),
    useGetImportDraft: vi.fn(),
  };
});

vi.mock('./fetchUpdateImportDraftRows', () => ({
  fetchUpdateImportDraftRows: vi.fn(),
}));

const householdSettingsMock = vi.hoisted(() => ({
  autoCheckImportRowWhenReady: true,
}));

vi.mock('@/lib/data-access/household', () => ({
  useGetHouseholdSettings: () => ({
    data: {
      settlementThreshold: null,
      autoCheckImportRowWhenReady:
        householdSettingsMock.autoCheckImportRowWhenReady,
    },
  }),
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

const draftId = 'draft_session_1';
const autosaveSnapshot = () => getImportReviewAutosaveSnapshot(draftId);

const hydrateSession = async () => {
  const hook = renderHook(() => useImportReviewSession(draftId), {
    wrapper: HouseholdHookWrapper,
  });
  await waitFor(() => {
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.meta).toBeDefined();
  });
  return hook;
};

describe('useImportReviewSession', () => {
  beforeEach(() => {
    householdSettingsMock.autoCheckImportRowWhenReady = true;
    getActiveQueryClient().clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    vi.mocked(fetchUpdateImportDraftRows).mockReset();
    vi.mocked(fetchUpdateImportDraftRows).mockImplementation(
      (_draftId, updates) =>
        Promise.resolve({
          rows: updates.map((entry) => {
            const { id, ...body } = entry;
            const row = draft.rows.find((r) => r.id === id);
            if (!row) throw new Error(`missing row ${id}`);
            return toPersistedImportDraftRow(row, {
              ...body,
              updatedAt: '2026-05-20T12:00:01.000Z',
            });
          }),
        } satisfies BatchUpdateImportDraftRowsResult)
    );
  });

  afterEach(async () => {
    vi.useRealTimers();
    endImportDraftPacedMutations();
    endImportDraftPersistBaselines();
    endImportReviewAutosave();
    await endImportDraftRowsCollections();
    getActiveQueryClient().clear();
  });

  it('hydrates slim draft meta and live rows from one draft GET', async () => {
    const { result, unmount } = await hydrateSession();

    expect(fetchImportDraft).toHaveBeenCalledTimes(1);
    expect(fetchImportDraft).toHaveBeenCalledWith(
      'draft_session_1',
      expect.any(AbortSignal)
    );

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

  it('flush waits for queued selection updates before resolving', async () => {
    const { result } = await hydrateSession();

    act(() => {
      result.current.setSelection(['row_ready'], false);
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.selectedForImport
    ).toBe(false);
  });

  it('keeps the session collection on unmount so remount still has live rows', async () => {
    const { unmount } = await hydrateSession();
    unmount();

    const { result, unmount: unmountAgain } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper: HouseholdHookWrapper }
    );

    await waitFor(() => {
      expect(result.current.meta?.id).toBe('draft_session_1');
      expect(result.current.rows).toHaveLength(2);
    });
    expect(result.current.isError).toBe(false);
    unmountAgain();
  });

  it('hydrates live rows from a warm draft cache (hub Continue / post-upload)', async () => {
    getActiveQueryClient().setQueryData(
      importDraftQueryKey('draft_session_1'),
      draft
    );

    const { result, unmount } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper: HouseholdHookWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.meta?.id).toBe('draft_session_1');
      expect(result.current.rows).toHaveLength(2);
    });
    expect(result.current.isError).toBe(false);
    unmount();
  });

  it('re-hydrates rows when remount races the previous session cleanup', async () => {
    getActiveQueryClient().setQueryData(
      importDraftQueryKey('draft_session_1'),
      draft
    );

    const first = renderHook(() => useImportReviewSession('draft_session_1'), {
      wrapper: HouseholdHookWrapper,
    });
    await waitFor(() => {
      expect(first.result.current.rows).toHaveLength(2);
    });
    first.unmount();

    const { result, unmount } = renderHook(
      () => useImportReviewSession('draft_session_1'),
      { wrapper: HouseholdHookWrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.meta?.id).toBe('draft_session_1');
      expect(result.current.rows).toHaveLength(2);
    });
    expect(result.current.isError).toBe(false);
    unmount();
  });

  it('exposes error state when the draft GET fails', async () => {
    vi.mocked(fetchImportDraft).mockRejectedValue(new Error('not found'));

    const { result, unmount } = renderHook(
      () => useImportReviewSession('missing_draft'),
      { wrapper: HouseholdHookWrapper }
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
    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
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

    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      {
        id: 'row_ready',
        reviewDescription: 'Coffee Shop',
        reviewCategoryId: 'cat_2',
      },
    ]);
    unmount();
  });

  it('merges multi-row edits within the debounce window into one batch PATCH', async () => {
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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      { id: 'row_ready', reviewDescription: 'Coffee Shop' },
      { id: 'row_b', reviewDescription: 'Market' },
    ]);
    unmount();
  });

  it('keeps live edits when persist fails', async () => {
    vi.mocked(fetchUpdateImportDraftRows).mockRejectedValue(
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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
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
      | ((result: BatchUpdateImportDraftRowsResult) => void)
      | undefined;
    const secondPersist = new Promise<BatchUpdateImportDraftRowsResult>(
      (resolve) => {
        resolveSecond = resolve;
      }
    );

    vi.mocked(fetchUpdateImportDraftRows)
      .mockImplementationOnce(() => firstPersist)
      .mockImplementationOnce(() => secondPersist);

    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Older' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Newer' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(2);
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
        rows: [
          toPersistedImportDraftRow(readyRow, {
            reviewDescription: 'Newer',
            updatedAt: '2026-05-20T12:00:02.000Z',
          }),
        ],
      });
      await secondPersist;
    });

    expect(
      result.current.rows.find((row) => row.id === 'row_ready')
        ?.reviewDescription
    ).toBe('Newer');
    unmount();
  });

  it('updates selection on the collection immediately (session-only)', async () => {
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

    await waitFor(() => {
      expect(
        result.current.rows.filter((row) =>
          ['row_ready', 'row_b'].includes(row.id)
        )
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'row_ready', selectedForImport: true }),
          expect.objectContaining({ id: 'row_b', selectedForImport: true }),
        ])
      );
    });
    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(
        result.current.rows.find((row) => row.id === 'row_ready')
      ).toMatchObject({
        selectedForImport: true,
        status: 'ready',
        invalidReason: null,
      });
    });
    unmount();
  });

  it('applies selection immediately without flushing pending field persists', async () => {
    const { result, unmount } = await hydrateSession();
    getActiveQueryClient().setQueryData(importDraftQueryKey(draftId), draft);

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Before select',
      });
    });

    act(() => {
      result.current.setSelection(['row_ready'], true);
    });

    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flush();
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      { id: 'row_ready', reviewDescription: 'Before select' },
    ]);
    unmount();
  });

  it('surfaces draft autosave Saving → Saved and Failed · Retry', async () => {
    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    expect(autosaveSnapshot().status).toBe('idle');

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Autosave me',
      });
    });

    expect(autosaveSnapshot().status).toBe('saving');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(autosaveSnapshot().status).toBe('saved');

    vi.mocked(fetchUpdateImportDraftRows).mockRejectedValueOnce(
      new Error('network')
    );

    act(() => {
      result.current.updateRow('row_ready', {
        reviewDescription: 'Will fail',
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(autosaveSnapshot().status).toBe('failed');
    expect(autosaveSnapshot().failedRowIds).toContain('row_ready');
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

    expect(autosaveSnapshot().hasUnsavedWork).toBe(true);
    expect(autosaveSnapshot().status).toBe('saving');

    let flushOk = false;
    await act(async () => {
      flushOk = await result.current.flush();
    });

    expect(flushOk).toBe(true);
    expect(autosaveSnapshot().hasUnsavedWork).toBe(false);
    expect(autosaveSnapshot().status).toBe('saved');
    unmount();
  });

  it('blocks flush while Failed remains and allows proceed after successful retry', async () => {
    vi.mocked(fetchUpdateImportDraftRows).mockRejectedValueOnce(
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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(autosaveSnapshot().status).toBe('failed');
    vi.useRealTimers();

    let flushOk = true;
    await act(async () => {
      flushOk = await result.current.flush();
    });
    expect(flushOk).toBe(false);
    expect(autosaveSnapshot().hasUnsavedWork).toBe(true);

    vi.mocked(fetchUpdateImportDraftRows).mockImplementation(
      (_draftId, updates) =>
        Promise.resolve({
          rows: updates.map((entry) => {
            const { id, ...body } = entry;
            const row = draft.rows.find((r) => r.id === id);
            if (!row) throw new Error(`missing row ${id}`);
            return toPersistedImportDraftRow(row, {
              ...body,
              updatedAt: '2026-05-20T12:00:02.000Z',
            });
          }),
        })
    );

    act(() => {
      result.current.retryAutosave();
    });

    await waitFor(() => {
      expect(autosaveSnapshot().status).toBe('saved');
    });

    await act(async () => {
      flushOk = await result.current.flush();
    });
    expect(flushOk).toBe(true);
    expect(autosaveSnapshot().hasUnsavedWork).toBe(false);
    unmount();
  });

  it('re-persists prior failed fields on the next edit and only then clears Failed', async () => {
    vi.mocked(fetchUpdateImportDraftRows).mockRejectedValueOnce(
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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(autosaveSnapshot().status).toBe('failed');
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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenLastCalledWith(draftId, [
      {
        id: 'row_ready',
        reviewCategoryId: 'cat_failed',
        reviewDescription: 'After failure',
      },
    ]);
    expect(autosaveSnapshot().status).toBe('saved');
    expect(autosaveSnapshot().failedRowIds).not.toContain('row_ready');
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

    await waitFor(() => {
      expect(
        result.current.rows.find((row) => row.id === 'row_b')?.status
      ).toBe('ready');
    });
    unmount();
  });

  it('does not let a stale success overwrite a reverted same-row value', async () => {
    let resolveFirst:
      | ((result: BatchUpdateImportDraftRowsResult) => void)
      | undefined;
    const firstPersist = new Promise<BatchUpdateImportDraftRowsResult>(
      (resolve) => {
        resolveFirst = resolve;
      }
    );

    vi.mocked(fetchUpdateImportDraftRows).mockImplementationOnce(
      () => firstPersist
    );

    const { result, unmount } = await hydrateSession();
    vi.useFakeTimers();

    act(() => {
      result.current.updateRow('row_ready', { reviewDescription: 'Attempt B' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
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
        rows: [
          toPersistedImportDraftRow(readyRow, {
            reviewDescription: 'Attempt B',
            updatedAt: '2026-05-20T12:00:02.000Z',
          }),
        ],
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
    vi.mocked(fetchUpdateImportDraftRows).mockImplementation(
      (_draftId, updates) =>
        Promise.resolve({
          rows: updates.map((entry) => {
            const { id, ...body } = entry;
            const row = refundDraft.rows.find((r) => r.id === id);
            if (!row) throw new Error(`missing row ${id}`);
            return toPersistedImportDraftRow(row, {
              ...body,
              updatedAt: '2026-05-20T12:00:01.000Z',
            });
          }),
        })
    );

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
      await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    });

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      { id: 'row_refund', reviewCategoryId: 'cat_2' },
    ]);
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

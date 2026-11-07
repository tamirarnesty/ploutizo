import '@/lib/access/working-set-cleanup';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchUpdateImportDraftRowsResult } from '@ploutizo/validators';
import {
  makeImportDraft,
  makeImportDraftRow,
  toPersistedImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';
import {
  REVIEW_PERSISTENCE_PACE_WAIT_MS,
  getReviewPersistence,
  releaseAllReviewPersistence,
} from './reviewPersistence';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

vi.mock('./fetchUpdateImportDraftRows', () => ({
  fetchUpdateImportDraftRows: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_persistence_1',
  rows: [
    makeImportDraftRow({
      id: 'row_1',
      reviewDescription: 'Coffee',
      status: 'ready',
    }),
  ],
});
const draftId = draft.id;

const savedRow = (
  fields: Parameters<typeof toPersistedImportDraftRow>[1],
  source = draft
) =>
  ({
    rows: [toPersistedImportDraftRow(source.rows[0], fields)],
  }) satisfies BatchUpdateImportDraftRowsResult;

const loadCollection = async (source = draft) => {
  getActiveQueryClient().setQueryData(importDraftQueryKey(source.id), source);
  vi.mocked(fetchImportDraft).mockResolvedValue(source);
  const collection = getImportDraftRowsCollection(source.id);
  await collection.preload();
  return collection;
};

const waitOutPace = async () => {
  await vi.advanceTimersByTimeAsync(REVIEW_PERSISTENCE_PACE_WAIT_MS);
  await vi.runAllTimersAsync();
};

describe('Review persistence', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchUpdateImportDraftRows).mockReset();
  });

  afterEach(async () => {
    vi.useRealTimers();
    releaseAllReviewPersistence();
    await endImportDraftRowsCollections();
    resetWorkingSetRegistryForTests();
    getActiveQueryClient().clear();
  });

  describe('edit', () => {
    it('saves after the pace wait, merges durable fields and re-derives status without trusting server status', async () => {
      const collection = await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue(
        savedRow({
          reviewCategoryId: null,
          updatedAt: '2026-05-20T12:00:05.000Z',
        })
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewCategoryId: null });
      expect(persistence.getSnapshot().status).toBe('saving');
      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();

      await waitOutPace();

      expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
        { id: 'row_1', reviewCategoryId: null },
      ]);
      const live = collection.get('row_1');
      expect(live?.reviewCategoryId).toBeNull();
      expect(live?.status).toBe('needs_review');
      expect(live?.updatedAt).toBe('2026-05-20T12:00:05.000Z');
      expect(persistence.getSnapshot().status).toBe('saved');
    });

    it('keeps newer live field values when a slower save resolves', async () => {
      const collection = await loadCollection();
      let resolveFirst:
        ((value: BatchUpdateImportDraftRowsResult) => void) | undefined;
      const firstSave = new Promise<BatchUpdateImportDraftRowsResult>(
        (resolve) => {
          resolveFirst = resolve;
        }
      );
      vi.mocked(fetchUpdateImportDraftRows).mockImplementationOnce(
        () => firstSave
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Attempt A' });
      await vi.advanceTimersByTimeAsync(REVIEW_PERSISTENCE_PACE_WAIT_MS);

      persistence.edit('row_1', { reviewDescription: 'Live wins' });
      expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');

      resolveFirst?.(
        savedRow({
          reviewDescription: 'Attempt A',
          updatedAt: '2026-05-20T12:00:02.000Z',
        })
      );
      await firstSave;
      await vi.runAllTimersAsync();

      expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');
    });

    it('keeps live working-copy values and reports failed rows when the save fails', async () => {
      const collection = await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockRejectedValue(
        new Error('network')
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Kept locally' });
      await waitOutPace();

      expect(collection.get('row_1')?.reviewDescription).toBe('Kept locally');
      expect(persistence.getSnapshot()).toMatchObject({
        status: 'failed',
        failedRowIds: ['row_1'],
        hasUnsavedWork: true,
      });
      expect(persistence.getSnapshot().failedFieldKeys.get('row_1')).toEqual([
        'reviewDescription',
      ]);
    });

    it('does not apply or persist a cross-account match id', async () => {
      const guardedDraft = makeImportDraft({
        id: draftId,
        matchTargetFacts: {
          tx_other: {
            id: 'tx_other',
            accountId: 'acct_other',
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Other card',
            rawDescription: 'Other card',
            externalId: 'visa-9999',
            deleted: false,
          },
        },
        rows: draft.rows,
      });
      const collection = await loadCollection(guardedDraft);

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewMatchedTransactionId: 'tx_other' });
      await waitOutPace();

      expect(collection.get('row_1')?.reviewMatchedTransactionId).toBeNull();
      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
      expect(persistence.getSnapshot().status).toBe('idle');
    });

    it('persists a same-account match id', async () => {
      const guardedDraft = makeImportDraft({
        id: draftId,
        matchTargetFacts: {
          tx_same: {
            id: 'tx_same',
            accountId: 'acct_1',
            type: 'expense',
            date: '2026-05-02',
            amount: 4218,
            description: 'Coffee',
            rawDescription: 'Coffee',
            externalId: 'visa-1001',
            deleted: false,
          },
        },
        rows: draft.rows,
      });
      const collection = await loadCollection(guardedDraft);
      vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue(
        savedRow(
          {
            reviewMatchedTransactionId: 'tx_same',
            updatedAt: '2026-05-20T12:00:05.000Z',
          },
          guardedDraft
        )
      );

      vi.useFakeTimers();
      getReviewPersistence(draftId).edit('row_1', {
        reviewMatchedTransactionId: 'tx_same',
      });
      await waitOutPace();

      expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
        { id: 'row_1', reviewMatchedTransactionId: 'tx_same' },
      ]);
      expect(collection.get('row_1')?.reviewMatchedTransactionId).toBe(
        'tx_same'
      );
    });
  });

  describe('flush', () => {
    it('commits before the pace wait elapses and resolves ok', async () => {
      await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue(
        savedRow({
          reviewDescription: 'Flushed',
          updatedAt: '2026-05-20T12:00:01.000Z',
        })
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Flushed' });

      const flushed = persistence.flush();
      await vi.runAllTimersAsync();

      await expect(flushed).resolves.toEqual({ ok: true });
      expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
      expect(persistence.getSnapshot()).toMatchObject({
        status: 'saved',
        hasUnsavedWork: false,
      });
    });

    it('resolves not ok when a row failed to save', async () => {
      await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockRejectedValue(
        new Error('network')
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Will fail' });

      const flushed = persistence.flush();
      await vi.runAllTimersAsync();

      await expect(flushed).resolves.toEqual({ ok: false });
    });

    it('resolves not ok when the draft is released while edits are queued', async () => {
      await loadCollection();
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Dropped' });

      const flushed = persistence.flush();
      persistence.release();
      await vi.runAllTimersAsync();

      await expect(flushed).resolves.toEqual({ ok: false });
    });

    it('resolves ok immediately when there is nothing to save', async () => {
      await loadCollection();
      await expect(getReviewPersistence(draftId).flush()).resolves.toEqual({
        ok: true,
      });
      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('re-sends only the current dirty diff of failed rows and clears the failure', async () => {
      await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockRejectedValueOnce(
        new Error('network')
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Retry me' });
      await waitOutPace();
      expect(persistence.getSnapshot().status).toBe('failed');

      vi.mocked(fetchUpdateImportDraftRows).mockReset();
      vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue(
        savedRow({
          reviewDescription: 'Retry me',
          updatedAt: '2026-05-20T12:00:09.000Z',
        })
      );
      await persistence.retry();

      expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
      expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
        { id: 'row_1', reviewDescription: 'Retry me' },
      ]);
      expect(persistence.getSnapshot()).toMatchObject({
        status: 'saved',
        failedRowIds: [],
        hasUnsavedWork: false,
      });
    });

    it('does nothing when no row failed', async () => {
      await loadCollection();
      await getReviewPersistence(draftId).retry();
      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers when work is queued and stops after unsubscribe', async () => {
      await loadCollection();
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      const listener = vi.fn();
      const unsubscribe = persistence.subscribe(listener);

      persistence.edit('row_1', { reviewDescription: 'One' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(persistence.getSnapshot().status).toBe('saving');

      unsubscribe();
      persistence.edit('row_1', { reviewDescription: 'Two' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps the snapshot reference stable between changes', async () => {
      await loadCollection();
      const persistence = getReviewPersistence(draftId);
      expect(persistence.getSnapshot()).toBe(persistence.getSnapshot());
    });
  });

  describe('signalUntilDirty', () => {
    it('aborts the first time new work begins saving, and not before', async () => {
      await loadCollection();
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);

      const signal = persistence.signalUntilDirty();
      expect(signal.aborted).toBe(false);

      persistence.edit('row_1', { reviewDescription: 'New work' });
      expect(signal.aborted).toBe(true);

      expect(persistence.signalUntilDirty().aborted).toBe(false);
    });

    it('does not abort when a pending save merely starts and finishes', async () => {
      await loadCollection();
      vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue(
        savedRow({
          reviewDescription: 'Queued',
          updatedAt: '2026-05-20T12:00:01.000Z',
        })
      );
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Queued' });

      const signal = persistence.signalUntilDirty();
      await waitOutPace();

      expect(persistence.getSnapshot().status).toBe('saved');
      expect(signal.aborted).toBe(false);
    });
  });

  describe('release', () => {
    it('drops queued edits, resets the snapshot and wakes a waiting flush', async () => {
      await loadCollection();
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      const listener = vi.fn();
      persistence.subscribe(listener);
      persistence.edit('row_1', { reviewDescription: 'Never sent' });
      listener.mockClear();

      persistence.release();
      await vi.runAllTimersAsync();

      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(persistence.getSnapshot().status).toBe('idle');
      expect(getReviewPersistence(draftId)).not.toBe(persistence);
    });

    it('releaseAllReviewPersistence releases every draft', () => {
      const first = getReviewPersistence('draft_a');
      const second = getReviewPersistence('draft_b');

      releaseAllReviewPersistence();

      expect(getReviewPersistence('draft_a')).not.toBe(first);
      expect(getReviewPersistence('draft_b')).not.toBe(second);
    });
  });

  describe('working-set switch', () => {
    it('does not mark the row saving when the scope is stale at commit', async () => {
      await loadCollection();
      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Stale scope' });
      replaceActiveWorkingSet();
      await waitOutPace();

      expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
      expect(persistence.getSnapshot()).toEqual({
        status: 'idle',
        failedRowIds: [],
        hasUnsavedWork: false,
        failedFieldKeys: new Map(),
      });
    });

    it('does not confirm a row after a household switch while a save is in flight', async () => {
      await loadCollection();
      let resolveSave:
        ((value: BatchUpdateImportDraftRowsResult) => void) | undefined;
      const inFlightSave = new Promise<BatchUpdateImportDraftRowsResult>(
        (resolve) => {
          resolveSave = resolve;
        }
      );
      vi.mocked(fetchUpdateImportDraftRows).mockImplementationOnce(
        () => inFlightSave
      );

      vi.useFakeTimers();
      const persistence = getReviewPersistence(draftId);
      persistence.edit('row_1', { reviewDescription: 'Held across switch' });
      await vi.advanceTimersByTimeAsync(REVIEW_PERSISTENCE_PACE_WAIT_MS);
      expect(persistence.getSnapshot().status).toBe('saving');

      replaceActiveWorkingSet();
      resolveSave?.(
        savedRow({
          reviewDescription: 'Held across switch',
          updatedAt: '2026-05-20T12:00:05.000Z',
        })
      );
      await inFlightSave;
      await vi.runAllTimersAsync();

      expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
      expect(
        getImportDraftRowsCollection(draftId).get('row_1')
      ).toBeUndefined();
      expect(getReviewPersistence(draftId).getSnapshot()).toEqual({
        status: 'idle',
        failedRowIds: [],
        hasUnsavedWork: false,
        failedFieldKeys: new Map(),
      });
    });
  });
});

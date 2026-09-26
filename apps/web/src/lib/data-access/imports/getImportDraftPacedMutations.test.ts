import '@/lib/access/working-set-cleanup';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchUpdateImportDraftRowsResult } from '@ploutizo/types';
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
  IMPORT_DRAFT_PACE_WAIT_MS,
  endImportDraftPacedMutations,
  getImportDraftPacedMutations,
} from './getImportDraftPacedMutations';
import { seedImportDraftPersistBaselines } from './importDraftPersistBaselines';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
} from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

vi.mock('./fetchUpdateImportDraftRows', () => ({
  fetchUpdateImportDraftRows: vi.fn(),
}));

describe('getImportDraftPacedMutations confirm persist', () => {
  const draft = makeImportDraft({
    id: 'draft_paced_1',
    rows: [
      makeImportDraftRow({
        id: 'row_1',
        reviewDescription: 'Coffee',
        status: 'ready',
      }),
    ],
  });
  const draftId = draft.id;

  beforeEach(() => {
    getActiveQueryClient().clear();
    getActiveQueryClient().setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    vi.mocked(fetchUpdateImportDraftRows).mockReset();
    endImportReviewAutosave();
    endImportDraftPacedMutations();
  });

  afterEach(async () => {
    vi.useRealTimers();
    endImportDraftPacedMutations();
    endImportReviewAutosave();
    await endImportDraftRowsCollections();
    resetWorkingSetRegistryForTests();
    getActiveQueryClient().clear();
  });

  it('merges durable fields and re-derives status without trusting server status', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue({
      rows: [
        toPersistedImportDraftRow(draft.rows[0], {
          reviewCategoryId: null,
          updatedAt: '2026-05-20T12:00:05.000Z',
        }),
      ],
    } satisfies BatchUpdateImportDraftRowsResult);

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(draft.id);
    seedImportDraftPersistBaselines(draft.id, collection.toArray);
    mutate({ rowId: 'row_1', patch: { reviewCategoryId: null } });

    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      { id: 'row_1', reviewCategoryId: null },
    ]);
    const live = collection.get('row_1');
    expect(live?.reviewCategoryId).toBeNull();
    expect(live?.status).toBe('needs_review');
    expect(live?.updatedAt).toBe('2026-05-20T12:00:05.000Z');
  });

  it('keeps newer live field values when a slower PATCH resolves', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    let resolveFirst:
      | ((value: BatchUpdateImportDraftRowsResult) => void)
      | undefined;
    const firstPersist = new Promise<BatchUpdateImportDraftRowsResult>(
      (resolve) => {
        resolveFirst = resolve;
      }
    );
    vi.mocked(fetchUpdateImportDraftRows).mockImplementationOnce(
      () => firstPersist
    );

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(draft.id);
    seedImportDraftPersistBaselines(draft.id, collection.toArray);
    mutate({ rowId: 'row_1', patch: { reviewDescription: 'Attempt A' } });
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);

    mutate({ rowId: 'row_1', patch: { reviewDescription: 'Live wins' } });
    expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');

    resolveFirst?.({
      rows: [
        toPersistedImportDraftRow(draft.rows[0], {
          reviewDescription: 'Attempt A',
          updatedAt: '2026-05-20T12:00:02.000Z',
        }),
      ],
    });
    await firstPersist;
    await vi.runAllTimersAsync();

    expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');
  });

  it('keeps live working-copy values when PATCH fails', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    vi.mocked(fetchUpdateImportDraftRows).mockRejectedValue(
      new Error('network')
    );

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(draft.id);
    seedImportDraftPersistBaselines(draft.id, collection.toArray);
    mutate({ rowId: 'row_1', patch: { reviewDescription: 'Kept locally' } });
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(collection.get('row_1')?.reviewDescription).toBe('Kept locally');
  });

  it('does not apply or persist a cross-account match id', async () => {
    const guardedDraft = makeImportDraft({
      id: 'draft_paced_1',
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
      rows: [
        makeImportDraftRow({
          id: 'row_1',
          reviewDescription: 'Coffee',
          status: 'ready',
        }),
      ],
    });
    getActiveQueryClient().setQueryData(
      importDraftQueryKey(guardedDraft.id),
      guardedDraft
    );
    vi.mocked(fetchImportDraft).mockResolvedValue(guardedDraft);
    const collection = getImportDraftRowsCollection(guardedDraft.id);
    await collection.preload();

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(guardedDraft.id);
    seedImportDraftPersistBaselines(guardedDraft.id, collection.toArray);
    mutate({
      rowId: 'row_1',
      patch: { reviewMatchedTransactionId: 'tx_other' },
    });
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(collection.get('row_1')?.reviewMatchedTransactionId).toBeNull();
    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
  });

  it('persists a same-account match id', async () => {
    const guardedDraft = makeImportDraft({
      id: 'draft_paced_1',
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
      rows: [
        makeImportDraftRow({
          id: 'row_1',
          reviewDescription: 'Coffee',
          status: 'ready',
        }),
      ],
    });
    getActiveQueryClient().setQueryData(
      importDraftQueryKey(guardedDraft.id),
      guardedDraft
    );
    vi.mocked(fetchImportDraft).mockResolvedValue(guardedDraft);
    vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue({
      rows: [
        toPersistedImportDraftRow(guardedDraft.rows[0], {
          reviewMatchedTransactionId: 'tx_same',
          updatedAt: '2026-05-20T12:00:05.000Z',
        }),
      ],
    } satisfies BatchUpdateImportDraftRowsResult);
    const collection = getImportDraftRowsCollection(guardedDraft.id);
    await collection.preload();

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(guardedDraft.id);
    seedImportDraftPersistBaselines(guardedDraft.id, collection.toArray);
    mutate({
      rowId: 'row_1',
      patch: { reviewMatchedTransactionId: 'tx_same' },
    });
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledWith(draftId, [
      { id: 'row_1', reviewMatchedTransactionId: 'tx_same' },
    ]);
    expect(collection.get('row_1')?.reviewMatchedTransactionId).toBe('tx_same');
  });

  it('does not mark row persist in flight when scope is stale at commit', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(draft.id);
    seedImportDraftPersistBaselines(draft.id, collection.toArray);
    mutate({ rowId: 'row_1', patch: { reviewDescription: 'Stale scope' } });
    replaceActiveWorkingSet();
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(fetchUpdateImportDraftRows).not.toHaveBeenCalled();
    expect(getImportReviewAutosaveSnapshot(draft.id)).toEqual({
      status: 'idle',
      failedRowIds: [],
      hasUnsavedWork: false,
      failedFieldKeys: new Map(),
    });
  });

  it('does not confirm row patch after a household switch while PATCH is in flight', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    let resolvePatch:
      | ((value: BatchUpdateImportDraftRowsResult) => void)
      | undefined;
    const patchPersist = new Promise<BatchUpdateImportDraftRowsResult>(
      (resolve) => {
        resolvePatch = resolve;
      }
    );
    vi.mocked(fetchUpdateImportDraftRows).mockImplementationOnce(
      () => patchPersist
    );

    vi.useFakeTimers();
    const mutate = getImportDraftPacedMutations(draft.id);
    seedImportDraftPersistBaselines(draft.id, collection.toArray);
    mutate({
      rowId: 'row_1',
      patch: { reviewDescription: 'Held across switch' },
    });
    await vi.advanceTimersByTimeAsync(IMPORT_DRAFT_PACE_WAIT_MS);

    expect(getImportReviewAutosaveSnapshot(draft.id).status).toBe('saving');
    replaceActiveWorkingSet();

    resolvePatch?.({
      rows: [
        toPersistedImportDraftRow(draft.rows[0], {
          reviewDescription: 'Held across switch',
          updatedAt: '2026-05-20T12:00:05.000Z',
        }),
      ],
    });
    await patchPersist;
    await vi.runAllTimersAsync();

    expect(fetchUpdateImportDraftRows).toHaveBeenCalledTimes(1);
    expect(getImportDraftRowsCollection(draft.id).get('row_1')).toBeUndefined();
    expect(getImportReviewAutosaveSnapshot(draft.id)).toEqual({
      status: 'idle',
      failedRowIds: [],
      hasUnsavedWork: false,
      failedFieldKeys: new Map(),
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateImportDraftRowResult } from '@ploutizo/types';
import {
  makeImportDraft,
  makeImportDraftRow,
  toPersistedImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';
import {
  IMPORT_ROW_PACE_WAIT_MS,
  getImportDraftRowPacedMutations,
  resetImportDraftRowPacedMutationsForTests,
} from './getImportDraftRowPacedMutations';
import {
  getImportDraftRowsCollection,
  resetImportDraftRowsCollectionsForTests,
} from './getImportDraftRowsCollection';
import { resetImportReviewAutosaveForTests } from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

vi.mock('./fetchUpdateImportDraftRow', () => ({
  fetchUpdateImportDraftRow: vi.fn(),
}));

describe('getImportDraftRowPacedMutations confirm persist', () => {
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

  beforeEach(() => {
    queryClient.clear();
    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    vi.mocked(fetchUpdateImportDraftRow).mockReset();
    resetImportReviewAutosaveForTests();
    resetImportDraftRowPacedMutationsForTests();
  });

  afterEach(async () => {
    vi.useRealTimers();
    resetImportDraftRowPacedMutationsForTests();
    resetImportReviewAutosaveForTests();
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('merges durable fields and re-derives status without trusting server status', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    vi.mocked(fetchUpdateImportDraftRow).mockResolvedValue({
      row: toPersistedImportDraftRow(draft.rows[0], {
        reviewCategoryId: null,
        updatedAt: '2026-05-20T12:00:05.000Z',
      }),
    } satisfies UpdateImportDraftRowResult);

    vi.useFakeTimers();
    const mutate = getImportDraftRowPacedMutations(draft.id, 'row_1');
    mutate({ patch: { reviewCategoryId: null } });

    await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(fetchUpdateImportDraftRow).toHaveBeenCalledWith('row_1', {
      reviewCategoryId: null,
    });
    const live = collection.get('row_1');
    expect(live?.reviewCategoryId).toBeNull();
    expect(live?.status).toBe('needs_review');
    expect(live?.updatedAt).toBe('2026-05-20T12:00:05.000Z');
  });

  it('keeps newer live field values when a slower PATCH resolves', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    let resolveFirst: ((value: UpdateImportDraftRowResult) => void) | undefined;
    const firstPersist = new Promise<UpdateImportDraftRowResult>((resolve) => {
      resolveFirst = resolve;
    });
    vi.mocked(fetchUpdateImportDraftRow).mockImplementationOnce(
      () => firstPersist
    );

    vi.useFakeTimers();
    const mutate = getImportDraftRowPacedMutations(draft.id, 'row_1');
    mutate({ patch: { reviewDescription: 'Attempt A' } });
    await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);

    mutate({ patch: { reviewDescription: 'Live wins' } });
    expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');

    resolveFirst?.({
      row: toPersistedImportDraftRow(draft.rows[0], {
        reviewDescription: 'Attempt A',
        updatedAt: '2026-05-20T12:00:02.000Z',
      }),
    });
    await firstPersist;
    await vi.runAllTimersAsync();

    expect(collection.get('row_1')?.reviewDescription).toBe('Live wins');
  });

  it('keeps live working-copy values when PATCH fails', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    vi.mocked(fetchUpdateImportDraftRow).mockRejectedValue(
      new Error('network')
    );

    vi.useFakeTimers();
    const mutate = getImportDraftRowPacedMutations(draft.id, 'row_1');
    mutate({ patch: { reviewDescription: 'Kept locally' } });
    await vi.advanceTimersByTimeAsync(IMPORT_ROW_PACE_WAIT_MS);
    await vi.runAllTimersAsync();

    expect(collection.get('row_1')?.reviewDescription).toBe('Kept locally');
  });
});

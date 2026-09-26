import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
  toPersistedImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { beginWorkingSetScope } from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRows } from './fetchUpdateImportDraftRows';
import { getImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { seedImportDraftPersistBaselines } from './importDraftPersistBaselines';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
} from './importReviewAutosave';
import { persistImportDraftBatch } from './persistImportDraftBatch';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./fetchUpdateImportDraftRows', () => ({
  fetchUpdateImportDraftRows: vi.fn(),
}));

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_persist_batch',
  rows: [
    makeImportDraftRow({
      id: 'row_ready',
      reviewDescription: 'Coffee',
    }),
  ],
});

describe('persistImportDraftBatch', () => {
  beforeEach(async () => {
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();
    seedImportDraftPersistBaselines(
      draft.id,
      collection.toArray.map((row) => ({ ...row, selectedForImport: false }))
    );
  });

  afterEach(() => {
    endImportReviewAutosave();
  });

  it('persists an edit to the API and marks it saved', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    const live = collection.get('row_ready');
    if (!live) throw new Error('missing row');
    const patch = { reviewDescription: 'Updated' };
    const attempted = { ...live, ...patch };

    vi.mocked(fetchUpdateImportDraftRows).mockResolvedValue({
      rows: [
        toPersistedImportDraftRow(draft.rows[0], {
          reviewDescription: 'Updated',
          updatedAt: '2026-05-20T12:00:01.000Z',
        }),
      ],
    });

    const ok = await persistImportDraftBatch({
      draftId: draft.id,
      scope: beginWorkingSetScope(),
      attempts: [{ rowId: 'row_ready', patch, attempted, original: live }],
    });

    expect(ok).toBe(true);
    expect(fetchUpdateImportDraftRows).toHaveBeenCalled();
    expect(getImportReviewAutosaveSnapshot(draft.id).status).toBe('saved');
  });
});

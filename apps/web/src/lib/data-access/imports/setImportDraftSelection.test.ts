import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/lib/access/working-set-cleanup';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import {
  getActiveQueryClient,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import { endImportReviewAutosave } from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { setImportDraftSelection } from './setImportDraftSelection';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_selection_1',
  rows: [
    makeImportDraftRow({
      id: 'row_1',
      reviewDescription: 'Coffee',
      selectedForImport: false,
    }),
  ],
});

describe('setImportDraftSelection', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    getActiveQueryClient().setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  afterEach(async () => {
    endImportReviewAutosave();
    await endImportDraftRowsCollections();
    resetWorkingSetRegistryForTests();
  });

  it('updates selection in the working copy without a network call', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    setImportDraftSelection(draft.id, ['row_1'], true);
    await vi.waitFor(() => {
      expect(collection.get('row_1')?.selectedForImport).toBe(true);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/lib/access/working-set-cleanup';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from '@/lib/access/working-set-registry';
import { fetchUpdateImportDraftRowSelection } from './fetchUpdateImportDraftRowSelection';
import { flushImportDraftRowPacedMutations } from './getImportDraftRowPacedMutations';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import {
  endImportReviewAutosave,
  getImportReviewAutosaveSnapshot,
} from './importReviewAutosave';
import { importDraftQueryKey } from './queryKeys';
import { persistImportDraftSelection } from './persistImportDraftSelection';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

vi.mock('./fetchUpdateImportDraftRowSelection', () => ({
  fetchUpdateImportDraftRowSelection: vi.fn(),
}));

vi.mock('./getImportDraftRowPacedMutations', () => ({
  flushImportDraftRowPacedMutations: vi.fn(),
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

describe('persistImportDraftSelection working-set scope', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    getActiveQueryClient().setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    vi.mocked(fetchUpdateImportDraftRowSelection).mockResolvedValue([]);
    vi.mocked(flushImportDraftRowPacedMutations).mockReset();
  });

  afterEach(async () => {
    endImportReviewAutosave();
    await endImportDraftRowsCollections();
    resetWorkingSetRegistryForTests();
  });

  it('does not persist selection after a household switch during paced flush', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();

    let resolveFlush: (() => void) | undefined;
    vi.mocked(flushImportDraftRowPacedMutations).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFlush = resolve;
        })
    );

    persistImportDraftSelection(draft.id, ['row_1'], true);
    replaceActiveWorkingSet();
    resolveFlush?.();
    await vi.waitFor(() => {
      expect(flushImportDraftRowPacedMutations).toHaveBeenCalled();
    });

    await Promise.resolve();

    expect(fetchUpdateImportDraftRowSelection).not.toHaveBeenCalled();
    expect(getImportReviewAutosaveSnapshot(draft.id)).toEqual({
      status: 'idle',
      failedRowIds: [],
      hasUnsavedWork: false,
      failedSelectionRowIds: [],
      failedFieldKeys: new Map(),
    });
    expect(getImportDraftRowsCollection(draft.id).get('row_1')).toBeUndefined();
  });
});

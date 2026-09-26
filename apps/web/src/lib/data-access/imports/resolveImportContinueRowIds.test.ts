import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { setImportDraftSelection } from './setImportDraftSelection';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';
import {
  resolveImportContinueRowIds,
  resolveImportContinueRows,
} from './resolveImportContinueRowIds';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_continue_rows',
  rows: [
    makeImportDraftRow({
      id: 'row_selected',
      selectedForImport: true,
    }),
    makeImportDraftRow({
      id: 'row_unselected',
      rowNumber: 2,
      selectedForImport: false,
    }),
  ],
});

describe('resolveImportContinueRowIds', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
    getActiveQueryClient().setQueryData(importDraftQueryKey(draft.id), draft);
  });

  afterEach(async () => {
    await endImportDraftRowsCollections();
    getActiveQueryClient().clear();
  });

  it('reads selection from the working copy when the collection is hydrated', async () => {
    const collection = getImportDraftRowsCollection(draft.id);
    await collection.preload();
    setImportDraftSelection(draft.id, ['row_selected'], false);
    setImportDraftSelection(draft.id, ['row_unselected'], true);

    expect(resolveImportContinueRowIds(draft.id, draft.rows)).toEqual([
      'row_unselected',
    ]);
  });

  it('falls back to rendered rows when the collection is empty', () => {
    expect(resolveImportContinueRows(draft.id, draft.rows)).toEqual(draft.rows);
    expect(resolveImportContinueRowIds(draft.id, draft.rows)).toEqual([
      'row_selected',
    ]);
  });
});

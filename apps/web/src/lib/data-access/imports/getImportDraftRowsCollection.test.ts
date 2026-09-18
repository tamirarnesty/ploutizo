import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
  releaseImportDraftRowsCollection,
} from './getImportDraftRowsCollection';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

vi.mock('./useGetImportDraft', () => ({
  fetchImportDraft: vi.fn(),
  useGetImportDraft: vi.fn(),
}));

const draft = makeImportDraft({
  id: 'draft_collection_1',
  rows: [makeImportDraftRow({ id: 'row_1' })],
});

describe('getImportDraftRowsCollection', () => {
  beforeEach(() => {
    getActiveQueryClient().clear();
    getActiveQueryClient().setQueryData(importDraftQueryKey(draft.id), draft);
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  afterEach(async () => {
    await endImportDraftRowsCollections();
    getActiveQueryClient().clear();
  });

  it('does not reuse a collection that is still being released', async () => {
    const first = getImportDraftRowsCollection(draft.id);
    const release = releaseImportDraftRowsCollection(draft.id);
    const next = getImportDraftRowsCollection(draft.id);

    expect(next).not.toBe(first);
    await release;
    expect(getImportDraftRowsCollection(draft.id)).toBe(next);
  });
});

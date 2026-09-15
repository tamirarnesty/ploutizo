import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import { testActiveHouseholdAccess } from '@/test/household-access';
import {
  getImportDraftRowsCollection,
  releaseImportDraftRowsCollection,
  resetImportDraftRowsCollectionsForTests,
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
    queryClient.clear();
    queryClient.setQueryData(
      importDraftQueryKey(testActiveHouseholdAccess, draft.id),
      draft
    );
    vi.mocked(fetchImportDraft).mockReset();
    vi.mocked(fetchImportDraft).mockResolvedValue(draft);
  });

  afterEach(async () => {
    await resetImportDraftRowsCollectionsForTests();
    queryClient.clear();
  });

  it('does not reuse a collection that is still being released', async () => {
    const first = getImportDraftRowsCollection(
      testActiveHouseholdAccess,
      draft.id
    );
    const release = releaseImportDraftRowsCollection(
      testActiveHouseholdAccess,
      draft.id
    );
    const next = getImportDraftRowsCollection(
      testActiveHouseholdAccess,
      draft.id
    );

    expect(next).not.toBe(first);
    await release;
    expect(
      getImportDraftRowsCollection(testActiveHouseholdAccess, draft.id)
    ).toBe(next);
  });
});

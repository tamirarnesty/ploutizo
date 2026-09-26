import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { ImportReviewRow } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

const createImportDraftRowsCollection = (draftId: string) =>
  createCollection(
    queryCollectionOptions({
      id: `import-draft-rows:${draftId}`,
      queryKey: importDraftQueryKey(draftId),
      queryFn: ({ signal }) => fetchImportDraft(draftId, signal),
      // Direct writes are mirrored into the draft query cache and re-selected,
      // so session selection must survive; server rows start unselected.
      select: (draft): ImportReviewRow[] =>
        draft.rows.map((row) => ({ selectedForImport: false, ...row })),
      queryClient: getActiveQueryClient(),
      getKey: (row: ImportReviewRow) => row.id,
      retry: 1,
    })
  );

type ImportDraftRowsCollection = ReturnType<
  typeof createImportDraftRowsCollection
>;

const importDraftRowsCollections = new Map<string, ImportDraftRowsCollection>();

export const getImportDraftRowsCollection = (
  draftId: string
): ImportDraftRowsCollection => {
  const existing = importDraftRowsCollections.get(draftId);
  if (existing) return existing;

  const collection = createImportDraftRowsCollection(draftId);
  importDraftRowsCollections.set(draftId, collection);
  return collection;
};

/**
 * Drop a draft's working copy after discard, finalize, or in tests.
 * Hub ↔ review and review ↔ finalize keep the collection warm; only call
 * while no useLiveQuery still reads this collection (not on route transitions).
 */
export const releaseImportDraftRowsCollection = async (draftId: string) => {
  const collection = importDraftRowsCollections.get(draftId);
  if (!collection) {
    getActiveQueryClient().removeQueries({
      queryKey: importDraftQueryKey(draftId),
    });
    return;
  }
  importDraftRowsCollections.delete(draftId);
  await collection.cleanup();
};

export const endImportDraftRowsCollections = async () => {
  await Promise.all(
    [...importDraftRowsCollections.keys()].map(releaseImportDraftRowsCollection)
  );
};

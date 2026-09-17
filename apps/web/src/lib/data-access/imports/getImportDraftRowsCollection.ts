import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { ImportDraftRow } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

const createImportDraftRowsCollection = (draftId: string) =>
  createCollection(
    queryCollectionOptions({
      id: `import-draft-rows:${draftId}`,
      queryKey: importDraftQueryKey(draftId),
      queryFn: ({ signal }) => fetchImportDraft(draftId, signal),
      select: (draft) => draft.rows,
      queryClient: getActiveQueryClient(),
      getKey: (row: ImportDraftRow) => row.id,
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

/** Drop a draft's working copy after discard, finalize, or in tests. Hub ↔ review nav keeps it warm. */
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

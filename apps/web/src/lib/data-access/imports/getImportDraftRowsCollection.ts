import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { ImportDraftRow } from '@ploutizo/types';
import { queryClient } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

const createImportDraftRowsCollection = (draftId: string) =>
  createCollection(
    queryCollectionOptions({
      id: `import-draft-rows:${draftId}`,
      queryKey: importDraftQueryKey(draftId),
      queryFn: () => fetchImportDraft(draftId),
      select: (draft) => draft.rows,
      queryClient,
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

/** End the review-session collection so a remount re-hydrates from GET. */
export const releaseImportDraftRowsCollection = async (draftId: string) => {
  const collection = importDraftRowsCollections.get(draftId);
  if (!collection) return;
  await collection.cleanup();
  importDraftRowsCollections.delete(draftId);
};

export const resetImportDraftRowsCollectionsForTests = async () => {
  await Promise.all(
    [...importDraftRowsCollections.keys()].map((draftId) =>
      releaseImportDraftRowsCollection(draftId)
    )
  );
};

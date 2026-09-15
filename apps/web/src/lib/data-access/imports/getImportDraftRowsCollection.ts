import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { ImportDraftRow } from '@ploutizo/types';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import { queryClient } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';
import { fetchImportDraft } from './useGetImportDraft';

const collectionCacheKey = (access: ActiveHouseholdAccess, draftId: string) =>
  `${access.signedInMemberId}:${access.activeHouseholdId}:${draftId}`;

const createImportDraftRowsCollection = (
  access: ActiveHouseholdAccess,
  draftId: string
) =>
  createCollection(
    queryCollectionOptions({
      id: `import-draft-rows:${collectionCacheKey(access, draftId)}`,
      queryKey: importDraftQueryKey(access, draftId),
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
  access: ActiveHouseholdAccess,
  draftId: string
): ImportDraftRowsCollection => {
  const key = collectionCacheKey(access, draftId);
  const existing = importDraftRowsCollections.get(key);
  if (existing) return existing;

  const collection = createImportDraftRowsCollection(access, draftId);
  importDraftRowsCollections.set(key, collection);
  return collection;
};

/** Drop a draft's working copy after discard (or in tests). Hub ↔ review nav keeps it warm. */
export const releaseImportDraftRowsCollection = async (
  access: ActiveHouseholdAccess,
  draftId: string
) => {
  const key = collectionCacheKey(access, draftId);
  const collection = importDraftRowsCollections.get(key);
  if (!collection) return;
  importDraftRowsCollections.delete(key);
  await collection.cleanup();
};

export const resetImportDraftRowsCollectionsForTests = async () => {
  await Promise.all(
    [...importDraftRowsCollections.keys()].map(async (key) => {
      const collection = importDraftRowsCollections.get(key);
      if (!collection) return;
      importDraftRowsCollections.delete(key);
      await collection.cleanup();
    })
  );
};

import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { importReviewRowSchema } from '@ploutizo/validators';
import type { ImportReviewRow } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { shouldRetryApiRequest } from '@/lib/queryClient';
import { importDraftQueryKey } from './queryKeys';
import { importDraftClientQueryPolicy } from './importDraftClientQueryPolicy';
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
      schema: importReviewRowSchema,
      getKey: (row) => row.id,
      retry: shouldRetryApiRequest,
      ...importDraftClientQueryPolicy,
    })
  );

type ImportDraftRowsCollection = ReturnType<
  typeof createImportDraftRowsCollection
>;

const importDraftRowsCollections = new Map<string, ImportDraftRowsCollection>();
const pendingIdleCleanups = new Map<string, Promise<void>>();

const waitForRowsCollectionSubscribersToClear = (
  collection: ImportDraftRowsCollection
) =>
  new Promise<void>((resolve) => {
    if (collection.subscriberCount === 0) {
      resolve();
      return;
    }

    const onSubscribersChange = () => {
      if (collection.subscriberCount > 0) return;
      collection.off('subscribers:change', onSubscribersChange);
      resolve();
    };

    collection.on('subscribers:change', onSubscribersChange);
    if (collection.subscriberCount === 0) {
      collection.off('subscribers:change', onSubscribersChange);
      resolve();
    }
  });

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
 * Hub ↔ review and review ↔ finalize keep the collection warm.
 *
 * Live queries keep this collection subscribed until they unsubscribe.
 * cleanup() while that count is above zero is a manual teardown and logs a
 * Live Query error, so cleanup waits for subscribers:change to reach zero.
 * That wait must not block the caller: discard navigates only after release
 * returns, and navigation is what unmounts the queries.
 */
export const releaseImportDraftRowsCollection = async (draftId: string) => {
  const inflight = pendingIdleCleanups.get(draftId);
  if (inflight) return inflight;

  const collection = importDraftRowsCollections.get(draftId);
  if (!collection) {
    getActiveQueryClient().removeQueries({
      queryKey: importDraftQueryKey(draftId),
    });
    return;
  }
  importDraftRowsCollections.delete(draftId);

  const subscribersAtRelease = collection.subscriberCount;
  const releasePromise = (async () => {
    if (collection.subscriberCount > 0) {
      await waitForRowsCollectionSubscribersToClear(collection);
    }
    await collection.cleanup();
  })().finally(() => {
    pendingIdleCleanups.delete(draftId);
  });
  pendingIdleCleanups.set(draftId, releasePromise);

  if (subscribersAtRelease > 0) return;

  await releasePromise;
};

export const endImportDraftRowsCollections = async () => {
  await Promise.all(
    [...importDraftRowsCollections.keys()].map(releaseImportDraftRowsCollection)
  );
};

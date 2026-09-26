import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { clearImportFinalizePreviewSession } from './importFinalizePreviewSession';
import { releaseImportDraftReviewRuntime } from './releaseImportDraftReviewRuntime';

/**
 * End a draft's client working copy when the business scope is done.
 * When a rows collection exists, cleanup owns the draft query key. When it
 * does not (hub discard before review), release still clears cached draft data.
 *
 * Do not release the rows collection on Review→Finalize navigation: TanStack DB
 * live queries (session + per-row) keep the source collection alive until they
 * unsubscribe; explicit collection.cleanup() during that window logs Live Query
 * errors (see query-collection cleanup docs).
 */
export const releaseImportDraftSession = async (draftId: string) => {
  await cancelImportDraftQueryFetches(draftId);
  releaseImportDraftReviewRuntime(draftId);
  clearImportFinalizePreviewSession(draftId);
  await releaseImportDraftRowsCollection(draftId);
};

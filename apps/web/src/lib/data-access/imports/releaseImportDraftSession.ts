import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import { clearImportFinalizePreviewSession } from './importFinalizePreviewSession';
import { releaseImportDraftReviewRuntime } from './releaseImportDraftReviewRuntime';

/**
 * End a draft's client working copy when the business scope is done.
 * When a rows collection exists, cleanup owns the draft query key. When it
 * does not (hub discard before review), release still clears cached draft data.
 */
export const releaseImportDraftSession = async (draftId: string) => {
  await cancelImportDraftQueryFetches(draftId);
  releaseImportDraftReviewRuntime(draftId);
  clearImportFinalizePreviewSession(draftId);
  await releaseImportDraftRowsCollection(draftId);
};

/**
 * After Continue succeeds, drop the rows collection on Finalize mount (Review unmounted).
 */
export const releaseImportDraftWorkingCopyForFinalize = async (
  draftId: string
) => {
  await cancelImportDraftQueryFetches(draftId);
  await releaseImportDraftRowsCollection(draftId);
};

import { redirect } from '@tanstack/react-router';
import { importDraftReviewRoute } from '@/lib/navigation';
import { importFinalizePreviewSessionQueryKey } from './queryKeys';
import type { QueryClient } from '@tanstack/react-query';
import type { ImportFinalizePreviewSession } from './importFinalizePreviewSession';

export const readImportFinalizePreviewSession = (
  queryClient: QueryClient,
  draftId: string
): ImportFinalizePreviewSession | undefined =>
  queryClient.getQueryData(importFinalizePreviewSessionQueryKey(draftId));

/** Route entry: Finalize requires a Continue handoff preview in the query cache. */
export const assertImportFinalizePreviewSession = (
  queryClient: QueryClient,
  draftId: string
) => {
  if (readImportFinalizePreviewSession(queryClient, draftId)?.preview) return;
  throw redirect({
    ...importDraftReviewRoute(draftId),
    state: { importReview: { prepareAgain: true } },
  });
};

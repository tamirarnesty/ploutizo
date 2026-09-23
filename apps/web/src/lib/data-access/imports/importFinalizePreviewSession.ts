import type { ImportFinalizePreview } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { readImportFinalizePreviewSession } from './importFinalizeRouteGuard';
import { importFinalizePreviewSessionQueryKey } from './queryKeys';

export interface ImportFinalizePreviewSession {
  rowIds: string[];
  preview: ImportFinalizePreview;
}

export const setImportFinalizePreviewSession = (
  draftId: string,
  session: ImportFinalizePreviewSession
) => {
  getActiveQueryClient().setQueryData(
    importFinalizePreviewSessionQueryKey(draftId),
    session
  );
};

export const getImportFinalizePreviewSession = (
  draftId: string
): ImportFinalizePreviewSession | undefined =>
  readImportFinalizePreviewSession(getActiveQueryClient(), draftId);

export const clearImportFinalizePreviewSession = (draftId: string) => {
  getActiveQueryClient().removeQueries({
    queryKey: importFinalizePreviewSessionQueryKey(draftId),
  });
};

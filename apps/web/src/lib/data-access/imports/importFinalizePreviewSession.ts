import type { ImportFinalizePreview } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
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
  getActiveQueryClient().getQueryData(
    importFinalizePreviewSessionQueryKey(draftId)
  );

export const clearImportFinalizePreviewSession = (draftId: string) => {
  getActiveQueryClient().removeQueries({
    queryKey: importFinalizePreviewSessionQueryKey(draftId),
  });
};

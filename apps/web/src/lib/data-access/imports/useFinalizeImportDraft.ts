import { useQueryClient } from '@tanstack/react-query';
import type { ImportCompletedResult } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody } from '@/lib/queryClient';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import { clearImportFinalizePreviewSession } from './importFinalizePreviewSession';
import { activeImportDraftsQueryKey, importHistoryQueryKey } from './queryKeys';

export const useFinalizeImportDraft = (draftId: string) => {
  const queryClient = useQueryClient();
  return useHouseholdMutation<
    ImportCompletedResult,
    ApiErrorBody,
    { rowIds: string[] }
  >({
    mutationFn: ({ rowIds }) => fetchFinalizeImportDraft(draftId, rowIds),
    onSuccess: async () => {
      clearImportFinalizePreviewSession(draftId);
      await releaseImportDraftSession(draftId);
      void queryClient.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: importHistoryQueryKey,
      });
    },
  });
};

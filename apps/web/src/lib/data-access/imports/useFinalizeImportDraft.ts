import { useQueryClient } from '@tanstack/react-query';
import type { ImportCompletedResult } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody } from '@/lib/queryClient';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import { activeImportDraftsQueryKey, importHistoryQueryKey } from './queryKeys';
import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';

export const useFinalizeImportDraft = (draftId: string) => {
  const queryClient = useQueryClient();
  return useHouseholdMutation<
    ImportCompletedResult,
    ApiErrorBody,
    { rowIds: string[] }
  >({
    mutationFn: ({ rowIds }) => fetchFinalizeImportDraft(draftId, rowIds),
    onMutate: async () => {
      await cancelImportDraftQueryFetches(draftId);
    },
    onSuccess: async () => {
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

import { useQueryClient } from '@tanstack/react-query';
import type { ImportCompletedResult } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import type { ApiErrorBody } from '@/lib/queryClient';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import {
  activeImportDraftsQueryKey,
  importHistoryQueryKey,
  importPreparedQueryKey,
} from './queryKeys';

export const useFinalizeImportDraft = (draftId: string) => {
  const queryClient = useQueryClient();
  return useHouseholdMutation<
    ImportCompletedResult,
    ApiErrorBody,
    { preparedSetId: string }
  >({
    mutationFn: ({ preparedSetId }) =>
      fetchFinalizeImportDraft(draftId, preparedSetId),
    onSuccess: async () => {
      await releaseImportDraftSession(draftId);
      queryClient.removeQueries({
        queryKey: importPreparedQueryKey(draftId),
      });
      void queryClient.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: importHistoryQueryKey,
      });
    },
  });
};

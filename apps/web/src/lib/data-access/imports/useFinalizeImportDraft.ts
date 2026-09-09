import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportCompletedResult } from '@ploutizo/types';
import type { ApiErrorBody } from '@/lib/queryClient';
import { fetchFinalizeImportDraft } from './fetchFinalizeImportDraft';
import {
  activeImportDraftsQueryKeyRoot,
  importDraftQueryKey,
  importHistoryQueryKey,
  importPreparedQueryKey,
} from './queryKeys';

export const useFinalizeImportDraft = (draftId: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    ImportCompletedResult,
    ApiErrorBody,
    { preparedSetId: string }
  >({
    mutationFn: ({ preparedSetId }) =>
      fetchFinalizeImportDraft(draftId, preparedSetId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: importPreparedQueryKey(draftId) });
      queryClient.removeQueries({ queryKey: importDraftQueryKey(draftId) });
      void queryClient.invalidateQueries({
        queryKey: activeImportDraftsQueryKeyRoot,
      });
      void queryClient.invalidateQueries({ queryKey: importHistoryQueryKey });
    },
  });
};

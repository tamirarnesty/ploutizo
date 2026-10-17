import { useQueryClient } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';
import { cancelImportDraftQueryFetches } from './cancelImportDraftQueryFetches';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import { activeImportDraftsQueryKey, importHistoryQueryKey } from './queryKeys';

export const useDiscardImportDraft = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (id: string) =>
      apiSend(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onMutate: async (draftId) => {
      await cancelImportDraftQueryFetches(draftId);
    },
    onSuccess: (_response, draftId) => {
      qc.setQueryData<ImportDraftSummary[]>(
        activeImportDraftsQueryKey,
        (current) => current?.filter((draft) => draft.id !== draftId)
      );
      // Review keeps live subscribers until it unmounts, which only happens
      // after this mutation settles and navigates away.
      void releaseImportDraftSession(draftId);
      void qc.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
    },
  });
};

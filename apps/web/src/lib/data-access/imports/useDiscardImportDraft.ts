import { useQueryClient } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { releaseImportDraftSession } from './releaseImportDraftSession';
import { activeImportDraftsQueryKey, importHistoryQueryKey } from './queryKeys';

export const useDiscardImportDraft = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async (_response, draftId) => {
      qc.setQueryData<ImportDraftSummary[]>(
        activeImportDraftsQueryKey,
        (current) => current?.filter((draft) => draft.id !== draftId)
      );
      await releaseImportDraftSession(draftId);
      void qc.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
    },
  });
};

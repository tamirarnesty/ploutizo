import { useQueryClient } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  activeImportDraftsQueryKey,
  importDraftQueryKey,
  importHistoryQueryKey,
} from './queryKeys';

export const useDiscardImportDraft = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_response, draftId) => {
      qc.setQueryData<ImportDraftSummary[]>(
        activeImportDraftsQueryKey,
        (current) => current?.filter((draft) => draft.id !== draftId)
      );
      void qc.invalidateQueries({
        queryKey: activeImportDraftsQueryKey,
      });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      qc.removeQueries({ queryKey: importDraftQueryKey(draftId) });
      void releaseImportDraftRowsCollection(draftId);
    },
  });
};

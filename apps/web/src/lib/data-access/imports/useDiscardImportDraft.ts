import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  activeImportDraftsQueryKey,
  importDraftQueryKey,
  importHistoryQueryKey,
} from './queryKeys';

export const useDiscardImportDraft = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_response, draftId) => {
      qc.setQueryData<ImportDraftSummary[]>(
        activeImportDraftsQueryKey(access),
        (current) => current?.filter((draft) => draft.id !== draftId)
      );
      void qc.invalidateQueries({
        queryKey: activeImportDraftsQueryKey(access),
      });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey(access) });
      qc.removeQueries({ queryKey: importDraftQueryKey(access, draftId) });
      void releaseImportDraftRowsCollection(access, draftId);
    },
  });
};

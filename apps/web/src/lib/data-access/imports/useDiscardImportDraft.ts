import { useAuth } from '@clerk/tanstack-react-start';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import { releaseImportDraftRowsCollection } from './getImportDraftRowsCollection';
import {
  activeImportDraftsQueryKey,
  activeImportDraftsQueryKeyRoot,
  importDraftQueryKey,
  importHistoryQueryKey,
} from './queryKeys';

export const useDiscardImportDraft = () => {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_response, draftId) => {
      if (orgId) {
        qc.setQueryData<ImportDraftSummary[]>(
          activeImportDraftsQueryKey(orgId),
          (current) => current?.filter((draft) => draft.id !== draftId)
        );
      }
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKeyRoot });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      qc.removeQueries({ queryKey: importDraftQueryKey(draftId) });
      void releaseImportDraftRowsCollection(draftId);
    },
  });
};

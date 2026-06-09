import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import {
  activeImportDraftsQueryKey,
  importDraftQueryKey,
  importHistoryQueryKey,
} from './queryKeys';

export const useDiscardImportDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_response, draftId) => {
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      qc.removeQueries({ queryKey: importDraftQueryKey(draftId) });
    },
  });
};

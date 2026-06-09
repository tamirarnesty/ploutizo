import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import {
  activeImportDraftsQueryKey,
  importHistoryQueryKey,
} from './useGetImportDrafts';

export const useDiscardImportDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/imports/drafts/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      void qc.invalidateQueries({ queryKey: ['imports', 'draft'] });
    },
  });
};

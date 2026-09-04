import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { CreateImportDraftResponse } from '@ploutizo/types';
import type { CreateImportDraftInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import {
  activeImportDraftsQueryKey,
  importDraftQueryKey,
  importHistoryQueryKey,
} from './queryKeys';

export const useCreateImportDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateImportDraftInput) =>
      apiFetch<CreateImportDraftResponse>('/api/imports/drafts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (response) => {
      if (response.kind === 'mapping_required') return;
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      qc.setQueryData(importDraftQueryKey(response.data.id), response.data);
      if (response.meta.reusedExisting) {
        toast.info('Resumed existing draft for this card.');
      } else {
        toast.success('CSV uploaded.');
      }
    },
  });
};

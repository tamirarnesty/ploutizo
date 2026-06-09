import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraft } from '@ploutizo/types';
import type { CreateImportDraftInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import {
  activeImportDraftsQueryKey,
  importHistoryQueryKey,
} from './useGetImportDrafts';
import { importDraftQueryKey } from './useGetImportDraft';

interface CreateImportDraftResponse {
  data: ImportDraft;
  meta: { reusedExisting: boolean };
}

export const useCreateImportDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateImportDraftInput) =>
      apiFetch<CreateImportDraftResponse>('/api/imports/drafts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (response) => {
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
      void qc.invalidateQueries({ queryKey: importHistoryQueryKey });
      qc.setQueryData(importDraftQueryKey(response.data.id), response.data);
    },
  });
};

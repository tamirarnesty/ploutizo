import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import {
  patchImportDraftRow,
  replaceImportDraftRow,
  restoreImportDraftCache,
} from './patchImportDraftCache';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';

interface UpdateImportDraftRowVariables {
  draftId: string;
  rowId: string;
  body: UpdateImportDraftRowInput;
}

export const useUpdateImportDraftRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, body }: UpdateImportDraftRowVariables) =>
      apiFetch<{ data: ImportDraftRow }>(`/api/imports/rows/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onMutate: async ({ draftId, rowId, body }) => {
      await qc.cancelQueries({ queryKey: importDraftQueryKey(draftId) });
      const previousDraft = qc.getQueryData<ImportDraft>(
        importDraftQueryKey(draftId)
      );
      patchImportDraftRow(qc, draftId, rowId, body);
      return { previousDraft, draftId };
    },
    onSuccess: (updatedRow, { draftId }) => {
      replaceImportDraftRow(qc, draftId, updatedRow);
    },
    onError: (_error, { draftId }, context) => {
      restoreImportDraftCache(qc, draftId, context?.previousDraft);
      void qc.invalidateQueries({ queryKey: importDraftQueryKey(draftId) });
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
    },
  });
};

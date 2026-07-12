import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraft, ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowSelectionInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';
import { patchImportDraftRowsSelection, restoreImportDraftCache } from './patchImportDraftCache';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';

interface UpdateImportDraftRowSelectionVariables {
  draftId: string;
  body: UpdateImportDraftRowSelectionInput;
}

export const useUpdateImportDraftRowSelection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, body }: UpdateImportDraftRowSelectionVariables) =>
      apiFetch<{ data: ImportDraftRow[] }>(
        `/api/imports/drafts/${draftId}/rows/selection`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        }
      ).then((r) => r.data),
    onMutate: async ({ draftId, body }) => {
      await qc.cancelQueries({ queryKey: importDraftQueryKey(draftId) });
      const previousDraft = qc.getQueryData<ImportDraft>(
        importDraftQueryKey(draftId)
      );
      patchImportDraftRowsSelection(
        qc,
        draftId,
        body.rowIds,
        body.selectedForImport
      );
      return { previousDraft, draftId };
    },
    onSuccess: (updatedRows, { draftId }) => {
      const updatedById = new Map(updatedRows.map((row) => [row.id, row]));
      qc.setQueryData<ImportDraft | undefined>(
        importDraftQueryKey(draftId),
        (current) => {
          if (!current) return current;
          const rows = current.rows.map((row) => {
            const updated = updatedById.get(row.id);
            return updated ? { ...row, ...updated } : row;
          });
          return { ...current, rows };
        }
      );
    },
    onError: (_error, { draftId }, context) => {
      restoreImportDraftCache(qc, draftId, context?.previousDraft);
      void qc.invalidateQueries({ queryKey: importDraftQueryKey(draftId) });
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
    },
  });
};

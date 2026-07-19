import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraft } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import {
  applyServerRowIfNewer,
  patchImportDraftRow,
  revertImportDraftRowPatch,
} from './patchImportDraftCache';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';
import { fetchUpdateImportDraftRow } from './fetchUpdateImportDraftRow';

interface UpdateImportDraftRowVariables {
  draftId: string;
  rowId: string;
  body: UpdateImportDraftRowInput;
}

export const useUpdateImportDraftRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, body }: UpdateImportDraftRowVariables) =>
      fetchUpdateImportDraftRow(rowId, body),
    onMutate: async ({ draftId, rowId, body }) => {
      await qc.cancelQueries({ queryKey: importDraftQueryKey(draftId) });
      const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
      const previousRow = draft?.rows.find((row) => row.id === rowId);
      patchImportDraftRow(qc, draftId, rowId, body);
      return { previousRow, draftId, rowId, body };
    },
    onSuccess: (updatedRow, { draftId }) => {
      applyServerRowIfNewer(qc, draftId, updatedRow);
    },
    onError: (_error, { draftId, rowId, body }, context) => {
      revertImportDraftRowPatch(qc, draftId, rowId, context?.previousRow, body);
      void qc.invalidateQueries({ queryKey: importDraftQueryKey(draftId) });
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
    },
  });
};

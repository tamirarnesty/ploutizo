import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraft } from '@ploutizo/types';
import type { UpdateImportDraftRowSelectionInput } from '@ploutizo/validators';
import {
  applyServerRowsIfNewer,
  patchImportDraftRowsSelection,
  revertImportDraftRowsSelection,
} from './patchImportDraftCache';
import { fetchUpdateImportDraftRowSelection } from './fetchUpdateImportDraftRowSelection';
import { activeImportDraftsQueryKey, importDraftQueryKey } from './queryKeys';

interface UpdateImportDraftRowSelectionVariables {
  draftId: string;
  body: UpdateImportDraftRowSelectionInput;
}

export const useUpdateImportDraftRowSelection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, body }: UpdateImportDraftRowSelectionVariables) =>
      fetchUpdateImportDraftRowSelection(draftId, body),
    onMutate: async ({ draftId, body }) => {
      await qc.cancelQueries({ queryKey: importDraftQueryKey(draftId) });
      const draft = qc.getQueryData<ImportDraft>(importDraftQueryKey(draftId));
      const previousSelections = new Map<string, boolean>();
      for (const id of body.rowIds) {
        const row = draft?.rows.find((r) => r.id === id);
        if (row) previousSelections.set(id, row.selectedForImport);
      }
      patchImportDraftRowsSelection(
        qc,
        draftId,
        body.rowIds,
        body.selectedForImport
      );
      return { previousSelections, draftId };
    },
    onSuccess: (updatedRows, { draftId }) => {
      applyServerRowsIfNewer(qc, draftId, updatedRows);
    },
    onError: (_error, { draftId, body }, context) => {
      if (context?.previousSelections) {
        revertImportDraftRowsSelection(
          qc,
          draftId,
          context.previousSelections,
          body.selectedForImport
        );
      }
      void qc.invalidateQueries({ queryKey: importDraftQueryKey(draftId) });
      void qc.invalidateQueries({ queryKey: activeImportDraftsQueryKey });
    },
  });
};

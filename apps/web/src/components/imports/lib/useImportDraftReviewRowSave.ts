import { useCallback } from 'react';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { useImportDraftReviewContext } from '../review/ImportDraftReviewContext';

export const useImportDraftReviewRowSave = (row: ImportDraftRow) => {
  const { draftId } = useImportDraftReviewContext();
  const updateRow = useUpdateImportDraftRow();
  const disabled = row.status === 'invalid';

  const saveField = useCallback(
    (
      body: UpdateImportDraftRowInput,
      options?: Parameters<typeof updateRow.mutate>[1]
    ) => {
      updateRow.mutate({ draftId, rowId: row.id, body }, options);
    },
    [draftId, row.id, updateRow]
  );

  return { saveField, disabled };
};

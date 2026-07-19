import { useCallback } from 'react';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';

export const useImportDraftReviewRowSave = (row: ImportDraftRow) => {
  const { updateRow } = useImportDraftReviewContext();
  const disabled = row.status === 'invalid';

  const saveField = useCallback(
    (body: UpdateImportDraftRowInput) => {
      updateRow(row.id, body);
    },
    [row.id, updateRow]
  );

  return { saveField, disabled };
};

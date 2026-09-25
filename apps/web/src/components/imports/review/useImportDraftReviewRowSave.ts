import { useCallback } from 'react';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';
import { useImportReviewRowScope } from './ImportReviewRowScope';

export const useImportDraftReviewRowSave = () => {
  const { updateRow } = useImportDraftReviewContext();
  const { row } = useImportReviewRowScope();
  const disabled = row.status === 'invalid';

  const saveField = useCallback(
    (body: UpdateImportDraftRowInput) => {
      updateRow(row.id, body);
    },
    [row.id, updateRow]
  );

  return { saveField, disabled, row };
};

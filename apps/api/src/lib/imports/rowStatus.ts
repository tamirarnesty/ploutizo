import type { ImportRowStatus, TransactionType } from '@ploutizo/types';

export interface ImportRowStatusInput {
  status: ImportRowStatus;
  reviewType: TransactionType | null;
  parsedType: TransactionType | null;
  reviewCategoryName: string | null;
}

export const computeImportRowStatus = (
  row: ImportRowStatusInput
): ImportRowStatus => {
  if (row.status === 'invalid') return 'invalid';

  const type = row.reviewType ?? row.parsedType;
  const requiresReview =
    type === 'settlement' ||
    ((type === 'expense' || type === 'refund') && !row.reviewCategoryName);

  return requiresReview ? 'needs_review' : 'ready';
};

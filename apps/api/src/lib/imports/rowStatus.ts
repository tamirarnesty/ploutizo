import type { ImportRowStatus, ImportTransactionType } from '@ploutizo/types';

export interface ImportRowStatusInput {
  status: ImportRowStatus;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewCategoryName: string | null;
}

export const computeImportRowStatus = (
  row: ImportRowStatusInput
): ImportRowStatus => {
  if (row.status === 'invalid') return 'invalid';
  if (row.status === 'skipped') return 'skipped';

  const type = row.reviewType ?? row.parsedType;
  if (!type) return 'needs_review';

  const requiresReview = type === 'settlement' || !row.reviewCategoryName;

  return requiresReview ? 'needs_review' : 'ready';
};

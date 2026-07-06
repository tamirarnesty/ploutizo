import type { ImportRowStatus, ImportTransactionType } from '@ploutizo/types';

export interface ImportRowStructuralFields {
  reviewDate: string | null;
  reviewAmount: number | null;
  reviewType: ImportTransactionType | null;
  reviewDescription: string | null;
  parsedDate: string | null;
  parsedAmount: number | null;
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
}

export const isImportRowStructurallyInvalid = (
  row: ImportRowStructuralFields
): boolean => {
  const date = row.reviewDate ?? row.parsedDate;
  const amount = row.reviewAmount ?? row.parsedAmount;
  const type = row.reviewType ?? row.parsedType;
  const description = row.reviewDescription ?? row.parsedDescription;
  return (
    !date || amount == null || amount <= 0 || !type || !description?.trim()
  );
};

export interface ImportRowStatusInput {
  status: ImportRowStatus;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
}

export const computeImportRowStatus = (
  row: ImportRowStatusInput
): ImportRowStatus => {
  if (row.status === 'invalid') return 'invalid';
  if (row.status === 'skipped') return 'skipped';

  const type = row.reviewType ?? row.parsedType;
  if (!type) return 'needs_review';

  const requiresReview =
    type === 'settlement' ||
    !row.reviewCategoryId ||
    row.reviewAssigneeMemberIds.length === 0;

  return requiresReview ? 'needs_review' : 'ready';
};

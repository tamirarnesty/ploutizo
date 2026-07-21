import {
  IMPORT_TRANSACTION_TYPE_VALUES,
  type ImportRowStatus,
  type ImportTransactionType,
} from '@ploutizo/types';

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

export interface ImportRowStatusInput {
  status: ImportRowStatus;
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
}

/** Fields required to derive durable/optimistic import row status. */
export type ImportRowStatusFields = ImportRowStructuralFields &
  ImportRowStatusInput;

export type ImportRowReviewBlocker =
  | 'date'
  | 'amount'
  | 'description'
  | 'type'
  | 'category'
  | 'assignee'
  | 'settlement';

export const isImportTransactionType = (
  value: string | null | undefined
): value is ImportTransactionType =>
  IMPORT_TRANSACTION_TYPE_VALUES.includes(value as ImportTransactionType);

export const toImportTransactionType = (
  value: string | null | undefined
): ImportTransactionType | null =>
  isImportTransactionType(value) ? value : null;

export const resolveImportRowReviewType = (
  row: Pick<ImportRowStatusInput, 'reviewType' | 'parsedType'>
): ImportTransactionType | null => row.reviewType ?? row.parsedType;

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

/**
 * Review-state helper: preserves sticky `invalid` / `skipped`, then evaluates
 * type / category / assignee readiness. Prefer {@link deriveImportRowStatus}
 * for full row recompute (API + optimistic cache).
 */
export const computeImportRowStatus = (
  row: ImportRowStatusInput
): ImportRowStatus => {
  if (row.status === 'invalid') return 'invalid';
  if (row.status === 'skipped') return 'skipped';

  const type = resolveImportRowReviewType(row);
  if (!type) return 'needs_review';

  const requiresReview =
    type === 'settlement' ||
    !row.reviewCategoryId ||
    row.reviewAssigneeMemberIds.length === 0;

  return requiresReview ? 'needs_review' : 'ready';
};

/**
 * Authoritative status derivation for draft row updates.
 * Matches API `updateImportDraftRow` and must be used for optimistic cache patches.
 */
export const deriveImportRowStatus = (
  row: ImportRowStatusFields
): ImportRowStatus => {
  if (row.status === 'skipped') return 'skipped';
  if (isImportRowStructurallyInvalid(row)) return 'invalid';
  return computeImportRowStatus({
    status: 'needs_review',
    reviewType: row.reviewType,
    parsedType: row.parsedType,
    reviewCategoryId: row.reviewCategoryId,
    reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
  });
};

export const withDerivedImportRowStatus = <T extends ImportRowStatusFields>(
  row: T
): T => ({
  ...row,
  status: deriveImportRowStatus(row),
});

export const computeImportDraftRowCounts = (
  rows: ReadonlyArray<{ status: ImportRowStatus }>
) => {
  const invalidRowCount = rows.filter((row) => row.status === 'invalid').length;
  return {
    rowCount: rows.length,
    validRowCount: rows.length - invalidRowCount,
    invalidRowCount,
  };
};

/** Structured review blockers aligned with derive/compute status rules. */
export const getImportRowReviewBlockers = (
  row: ImportRowStatusFields
): ImportRowReviewBlocker[] => {
  const blockers: ImportRowReviewBlocker[] = [];
  const date = row.reviewDate ?? row.parsedDate;
  const amount = row.reviewAmount ?? row.parsedAmount;
  const type = resolveImportRowReviewType(row);
  const description = row.reviewDescription ?? row.parsedDescription;

  if (!date) blockers.push('date');
  if (amount == null || amount <= 0) blockers.push('amount');
  if (!description?.trim()) blockers.push('description');
  if (!type) blockers.push('type');
  if (type === 'settlement') blockers.push('settlement');
  if (!row.reviewCategoryId) blockers.push('category');
  if (row.reviewAssigneeMemberIds.length === 0) blockers.push('assignee');

  return blockers;
};

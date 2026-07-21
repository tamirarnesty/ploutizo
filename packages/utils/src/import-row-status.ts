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

export interface ImportRowReviewFields {
  reviewType: ImportTransactionType | null;
  parsedType: ImportTransactionType | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
}

/** Fields required to derive durable/optimistic import row status. */
export type ImportRowStatusFields = ImportRowStructuralFields &
  ImportRowReviewFields & {
    status: ImportRowStatus;
  };

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

export const resolveImportRowReviewDate = (
  row: Pick<ImportRowStructuralFields, 'reviewDate' | 'parsedDate'>
): string | null => row.reviewDate ?? row.parsedDate;

export const resolveImportRowReviewAmount = (
  row: Pick<ImportRowStructuralFields, 'reviewAmount' | 'parsedAmount'>
): number | null => row.reviewAmount ?? row.parsedAmount;

export const resolveImportRowReviewType = (
  row: Pick<ImportRowReviewFields, 'reviewType' | 'parsedType'>
): ImportTransactionType | null => row.reviewType ?? row.parsedType;

export const resolveImportRowReviewDescription = (
  row: Pick<
    ImportRowStructuralFields,
    'reviewDescription' | 'parsedDescription'
  >
): string | null => {
  const description = row.reviewDescription ?? row.parsedDescription;
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
};

export const isImportRowStructurallyInvalid = (
  row: ImportRowStructuralFields
): boolean => {
  const date = resolveImportRowReviewDate(row);
  const amount = resolveImportRowReviewAmount(row);
  const type = resolveImportRowReviewType(row);
  const description = resolveImportRowReviewDescription(row);
  return !date || amount == null || amount <= 0 || !type || !description;
};

/** Review-phase readiness once structural fields are valid (not sticky). */
const evaluateReviewReadiness = (
  row: ImportRowReviewFields
): Extract<ImportRowStatus, 'needs_review' | 'ready'> => {
  const type = resolveImportRowReviewType(row);
  if (!type) return 'needs_review';

  const requiresReview =
    type === 'settlement' ||
    !row.reviewCategoryId ||
    row.reviewAssigneeMemberIds.length === 0;

  return requiresReview ? 'needs_review' : 'ready';
};

/**
 * Authoritative status derivation for ingest, API updates, and optimistic cache.
 * Sticky only for `skipped`; structural invalidity is always re-evaluated.
 */
export const deriveImportRowStatus = (
  row: ImportRowStatusFields
): ImportRowStatus => {
  if (row.status === 'skipped') return 'skipped';
  if (isImportRowStructurallyInvalid(row)) return 'invalid';
  return evaluateReviewReadiness(row);
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

/** Structured review blockers aligned with {@link deriveImportRowStatus}. */
export const getImportRowReviewBlockers = (
  row: ImportRowStatusFields
): ImportRowReviewBlocker[] => {
  const blockers: ImportRowReviewBlocker[] = [];
  const date = resolveImportRowReviewDate(row);
  const amount = resolveImportRowReviewAmount(row);
  const type = resolveImportRowReviewType(row);
  const description = resolveImportRowReviewDescription(row);

  if (!date) blockers.push('date');
  if (amount == null || amount <= 0) blockers.push('amount');
  if (!description) blockers.push('description');
  if (!type) blockers.push('type');
  if (type === 'settlement') blockers.push('settlement');
  if (!row.reviewCategoryId) blockers.push('category');
  if (row.reviewAssigneeMemberIds.length === 0) blockers.push('assignee');

  return blockers;
};

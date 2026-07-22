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

const STRUCTURAL_BLOCKERS = new Set<ImportRowReviewBlocker>([
  'date',
  'amount',
  'description',
  'type',
]);

export interface ImportRowEvaluation {
  status: ImportRowStatus;
  blockers: ImportRowReviewBlocker[];
}

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

const getStructuralBlockers = (
  row: ImportRowStructuralFields
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
  return blockers;
};

const getReviewPhaseBlockers = (
  row: ImportRowReviewFields
): ImportRowReviewBlocker[] => {
  const blockers: ImportRowReviewBlocker[] = [];
  const type = resolveImportRowReviewType(row);

  if (type === 'settlement') blockers.push('settlement');
  if (!row.reviewCategoryId) blockers.push('category');
  if (row.reviewAssigneeMemberIds.length === 0) blockers.push('assignee');
  return blockers;
};

/** Structured review blockers — single rule list for status and tooltips. */
export const getImportRowReviewBlockers = (
  row: ImportRowStructuralFields & ImportRowReviewFields
): ImportRowReviewBlocker[] => [
  ...getStructuralBlockers(row),
  ...getReviewPhaseBlockers(row),
];

export const isImportRowStructurallyInvalid = (
  row: ImportRowStructuralFields
): boolean => getStructuralBlockers(row).length > 0;

/**
 * Single evaluation of durable/optimistic import row status + blockers.
 * Sticky only for `skipped`; structural invalidity is always re-evaluated.
 */
export const evaluateImportRow = (
  row: ImportRowStatusFields
): ImportRowEvaluation => {
  const blockers = getImportRowReviewBlockers(row);

  if (row.status === 'skipped') {
    return { status: 'skipped', blockers };
  }

  if (blockers.some((blocker) => STRUCTURAL_BLOCKERS.has(blocker))) {
    return { status: 'invalid', blockers };
  }

  if (blockers.length > 0) {
    return { status: 'needs_review', blockers };
  }

  return { status: 'ready', blockers: [] };
};

export const deriveImportRowStatus = (
  row: ImportRowStatusFields
): ImportRowStatus => evaluateImportRow(row).status;

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

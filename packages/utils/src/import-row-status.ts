import type {
  ImportRowReviewBlocker,
  ImportRowStatus,
  ImportTransactionType,
  ReviewedImportValues,
} from '@ploutizo/types';
import {
  isImportTransactionType,
  toImportTransactionType,
} from './import-coercion';
import { resolveReviewedImportValues } from './reviewed-import-values';

export type { ImportRowReviewBlocker };
export { isImportTransactionType, toImportTransactionType };

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
  /** Settlement funding account — required for new settlement creates. */
  reviewCounterpartAccountId: string | null;
  /**
   * When true, an explicit refund link is present but invalid/unfinalizable.
   * Computed by draft-level refund-link evaluation (not stored).
   */
  refundLinkBlocked?: boolean;
  /**
   * When true, match/collision/advisory review is unresolved.
   * Computed by draft-level match evaluation (not stored).
   */
  matchBlocked?: boolean;
}

/** Durable/optimistic review fields used to derive import row status. */
export type ImportRowStatusInput = ImportRowStructuralFields &
  ImportRowReviewFields;

export type ImportRowStatusFields = ImportRowStatusInput;

/** Partial runtime row shapes may omit assignees before normalization. */
export type ImportRowStatusNormalizeInput = Omit<
  ImportRowStatusInput,
  | 'reviewAssigneeMemberIds'
  | 'reviewCounterpartAccountId'
  | 'refundLinkBlocked'
  | 'matchBlocked'
> & {
  reviewAssigneeMemberIds?: string[] | null;
  reviewCounterpartAccountId?: string | null;
  refundLinkBlocked?: boolean;
  matchBlocked?: boolean;
};

export type ImportRowStructuralBlocker = Extract<
  ImportRowReviewBlocker,
  'date' | 'amount' | 'description' | 'type'
>;

const STRUCTURAL_BLOCKER_MESSAGES: Record<ImportRowStructuralBlocker, string> =
  {
    date: 'Date must be a valid YYYY-MM-DD value.',
    amount: 'Amount must be a positive number.',
    description: 'Description is required.',
    type: 'Type must be expense, refund, or settlement.',
  };

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

const structuralBlockersFromValues = (
  values: Pick<ReviewedImportValues, 'date' | 'amount' | 'type' | 'description'>
): ImportRowStructuralBlocker[] => {
  const blockers: ImportRowStructuralBlocker[] = [];
  if (!values.date) blockers.push('date');
  if (values.amount == null || values.amount <= 0) blockers.push('amount');
  if (!values.description) blockers.push('description');
  if (!values.type) blockers.push('type');
  return blockers;
};

export const getImportRowStructuralBlockers = (
  row: ImportRowStructuralFields
): ImportRowStructuralBlocker[] =>
  structuralBlockersFromValues(resolveReviewedImportValues(row));

export const formatImportRowStructuralInvalidReason = (
  row: ImportRowStructuralFields
): string | null => {
  const blockers = getImportRowStructuralBlockers(row);
  if (blockers.length === 0) return null;
  return blockers
    .map((blocker) => STRUCTURAL_BLOCKER_MESSAGES[blocker])
    .join(' ');
};

export const toImportRowStatusFields = (
  row: ImportRowStatusNormalizeInput
): ImportRowStatusFields => ({
  reviewDate: row.reviewDate ?? null,
  reviewAmount: row.reviewAmount ?? null,
  reviewType: toImportTransactionType(row.reviewType),
  reviewDescription: row.reviewDescription ?? null,
  parsedDate: row.parsedDate ?? null,
  parsedAmount: row.parsedAmount ?? null,
  parsedType: toImportTransactionType(row.parsedType),
  parsedDescription: row.parsedDescription ?? null,
  reviewCategoryId: row.reviewCategoryId ?? null,
  reviewAssigneeMemberIds: row.reviewAssigneeMemberIds ?? [],
  reviewCounterpartAccountId: row.reviewCounterpartAccountId ?? null,
  refundLinkBlocked: row.refundLinkBlocked ?? false,
  matchBlocked: row.matchBlocked ?? false,
});

const getReviewPhaseBlockers = (
  row: ImportRowReviewFields,
  values: ReviewedImportValues
): ImportRowReviewBlocker[] => {
  const blockers: ImportRowReviewBlocker[] = [];

  if (values.type === 'expense' || values.type === 'refund') {
    if (!values.categoryId) blockers.push('category');
  }

  if (values.type === 'settlement' && !values.counterpartAccountId) {
    // Funding / Pay-toward readiness — counterpart is settlement funding.
    blockers.push('settlement');
  }

  if (values.assigneeMemberIds.length === 0) blockers.push('assignee');

  if (values.type === 'refund' && row.refundLinkBlocked) {
    blockers.push('refund_link');
  }
  if (row.matchBlocked) {
    blockers.push('match');
  }
  return blockers;
};

/** Structured review blockers — single rule list for status and tooltips. */
export const getImportRowReviewBlockers = (
  row: ImportRowStructuralFields & ImportRowReviewFields
): ImportRowReviewBlocker[] => {
  const values = resolveReviewedImportValues(row);
  return [
    ...structuralBlockersFromValues(values),
    ...getReviewPhaseBlockers(row, values),
  ];
};

export const isImportRowStructurallyInvalid = (
  row: ImportRowStructuralFields
): boolean => getImportRowStructuralBlockers(row).length > 0;

/**
 * Single evaluation of review status + blockers from durable/optimistic facts.
 * Selection is not a review status; `skipped` is a prepared/finalized outcome.
 */
export const evaluateImportRow = (
  row: ImportRowStatusFields
): ImportRowEvaluation => {
  const blockers = getImportRowReviewBlockers(row);

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

export const withDerivedImportRowStatus = <T extends ImportRowStatusInput>(
  row: T
): T & { status: ImportRowStatus } => ({
  ...row,
  status: deriveImportRowStatus(row),
});

export const computeImportDraftRowCounts = (
  rows: readonly { status: ImportRowStatus }[]
) => {
  const invalidRowCount = rows.filter((row) => row.status === 'invalid').length;
  return {
    rowCount: rows.length,
    validRowCount: rows.length - invalidRowCount,
    invalidRowCount,
  };
};

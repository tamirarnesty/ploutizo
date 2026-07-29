import type {
  ImportBatchStatus,
  ImportPreparedOutcome,
  ImportRowStatus,
  ImportTransactionType,
} from './enums';

/** Seeded settlement category for bill-payment readability in transaction lists. */
export const BILL_PAYMENT_CATEGORY_NAME = 'Bill Payment' as const;

/** Description substring used by seeded bill-payment detection and merchant rule. */
export const BILL_PAYMENT_DESCRIPTION_PATTERN = 'PAYMENT THANK YOU' as const;

export interface ImportTargetAccount {
  id: string;
  name: string;
  institution: string | null;
  lastFour: string | null;
}

export interface ImportDraftSummary {
  id: string;
  account: ImportTargetAccount;
  source: string;
  status: ImportBatchStatus;
  fileName: string | null;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  importedAt: string;
  completedAt: string | null;
  discardedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDraftRow {
  id: string;
  batchId: string;
  rowNumber: number;
  status: ImportRowStatus;
  invalidReason: string | null;
  rawData: Record<string, string>;
  externalId: string | null;
  sourceDate: string | null;
  sourceAmount: string | null;
  sourceDescription: string | null;
  sourceType: string | null;
  parsedDate: string | null;
  parsedAmount: number | null;
  parsedType: ImportTransactionType | null;
  parsedDescription: string | null;
  reviewDate: string | null;
  reviewAmount: number | null;
  reviewType: ImportTransactionType | null;
  reviewDescription: string | null;
  reviewCategoryId: string | null;
  reviewAssigneeMemberIds: string[];
  /** Settlement funding account (paid-from / counterpart). */
  reviewCounterpartAccountId: string | null;
  /** Reviewed refund link to an existing expense transaction. */
  reviewRefundOf: string | null;
  /**
   * Reviewed refund link to an expense row in the same import draft.
   * Mutually exclusive with `reviewRefundOf` at the service boundary.
   */
  reviewRefundOfBatchRowId: string | null;
  /** Original CSV refund-link hint retained as provenance. */
  reviewRefundLinkHint: string | null;
  reviewNotes: string | null;
  reviewTagIds: string[];
  selectedForImport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImportDraft extends ImportDraftSummary {
  rows: ImportDraftRow[];
}

/** Immutable reviewed values captured when a prepared set revision is created. */
export interface ImportPreparedReviewedValues {
  date: string | null;
  amount: number | null;
  type: ImportTransactionType | null;
  description: string | null;
  categoryId: string | null;
  assigneeMemberIds: string[];
  counterpartAccountId: string | null;
  refundOf: string | null;
  /** Same-import expense row id when the refund is linked within the draft. */
  refundOfBatchRowId: string | null;
  notes: string | null;
  tagIds: string[];
  externalId: string | null;
  rawDescription: string | null;
  selectedForImport: boolean;
}

export interface ImportPreparedSetSummary {
  id: string;
  batchId: string;
  revision: number;
  createdAt: string;
}

export interface ImportPreparedOutcomeRow {
  id: string;
  preparedSetId: string;
  batchRowId: string;
  outcome: ImportPreparedOutcome;
  transactionId: string | null;
  reviewedValues: ImportPreparedReviewedValues;
  createdAt: string;
}

export interface ImportPreparedSet extends ImportPreparedSetSummary {
  outcomes: ImportPreparedOutcomeRow[];
}

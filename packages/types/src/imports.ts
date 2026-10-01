import type {
  ImportRowOutcome,
  ImportRowStatus,
  ImportTransactionType,
  MerchantMatchType,
} from './enums';

/** Review-field blockers from the shared import draft evaluator. */
export type ImportRowReviewBlocker =
  | 'date'
  | 'amount'
  | 'description'
  | 'type'
  | 'category'
  | 'assignee'
  | 'settlement'
  | 'refund_link'
  | 'match';

/** Seeded settlement category for bill-payment readability in transaction lists. */
export const BILL_PAYMENT_CATEGORY_NAME = 'Bill Payment' as const;

/** Exact normalized phrases that identify bill-payment settlements on refund rows. */
export const BILL_PAYMENT_PHRASES = [
  'PAYMENT THANK YOU',
  'PAYMENT RECEIVED THANK YOU',
  'PAIEMENT MERCI',
] as const;

export type BillPaymentPhrase = (typeof BILL_PAYMENT_PHRASES)[number];

export const normalizeBillPaymentPhrase = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const matchesBillPaymentPhrase = (
  description: string | null
): boolean => {
  if (!description?.trim()) return false;
  return (BILL_PAYMENT_PHRASES as readonly string[]).includes(
    normalizeBillPaymentPhrase(description)
  );
};

/** Merchant rule shape consumed by upload-time import classification. */
export interface ImportClassificationMerchantRule {
  pattern: string;
  matchType: MerchantMatchType;
  renameTo: string | null;
  categoryId: string | null;
  assigneeId: string | null;
  tagIds: readonly string[];
}

/** Existing ledger row used for import match and refund-link suggestions. */
export interface MatchTargetFact {
  id: string;
  accountId: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  rawDescription: string | null;
  externalId: string | null;
  deleted: boolean;
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
  /** Same-import refund target (draft row id). Durable Import draft fact. */
  reviewRefundOfBatchRowId: string | null;
  /** Original CSV refund-link hint retained as provenance. */
  reviewRefundLinkHint: string | null;
  /** Accepted match target; selecting an exact candidate writes this. */
  reviewMatchedTransactionId: string | null;
  /** User declined match suggestions and will import the row as new. */
  reviewMatchDismissed: boolean;
  reviewNotes: string | null;
  reviewTagIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** Import draft row in the review session working copy, with session-only selection. */
export type ImportReviewRow = ImportDraftRow & {
  selectedForImport: boolean;
};

/**
 * Namespaced requirement keys returned by Continue/Finalize. Presentation copy
 * is owned by the Web app — these keys are the server contract.
 */
export const IMPORT_REQUIREMENT_KEY_VALUES = [
  'transaction.date.required',
  'transaction.amount.positive',
  'transaction.description.required',
  'transaction.type.required',
  'transaction.category.required',
  'transaction.category.unknown',
  'transaction.tag.unknown',
  'transaction.assignee.required',
  'transaction.assignee.unknown',
  'transaction.account.missing',
  'transaction.account.disallowed_type',
  'transaction.account.same_account_not_allowed',
  'import.refund_link.missing_target',
  'import.refund_link.wrong_account',
  'import.refund_link.deleted_target',
  'import.refund_link.not_expense',
  'import.refund_link.target_not_selected',
  'import.refund_link.target_not_expense',
  'import.refund_link.target_unfinalizable',
  'import.refund_link.cumulative_exceeds',
  'import.refund_link.self_link',
  'import.refund_link.dual_link',
  'import.match.collision',
  'import.match.invalidated_decision',
  'import.match.advisory_unresolved',
  'import.match.missing_target',
  'import.match.wrong_account',
  'import.match.deleted_target',
  'import.match.ambiguous_exact',
  'import.match.duplicate_target',
  'import.external_id.active_conflict',
] as const;

export type ImportRequirementKey =
  (typeof IMPORT_REQUIREMENT_KEY_VALUES)[number];

export interface ImportRequirementFailure {
  batchRowId: string;
  key: ImportRequirementKey;
  params?: Record<string, unknown>;
}

export interface ImportRequirementFailureDetails {
  rows: ImportRequirementFailure[];
}

/** Effective transaction values after reviewed edits override parsed values. */
export interface ReviewedImportValues {
  date: string | null;
  amount: number | null;
  type: ImportTransactionType | null;
  description: string | null;
  categoryId: string | null;
  assigneeMemberIds: string[];
  counterpartAccountId: string | null;
  refundOf: string | null;
  refundOfBatchRowId: string | null;
  notes: string | null;
  tagIds: string[];
}

/** Immutable import-source identity retained beside reviewed transaction values. */
export interface ImportRowProvenance {
  externalId: string | null;
  rawDescription: string | null;
  /** Parsed description used for match fallback when rawDescription is null. */
  parsedDescription: string | null;
}

/** Reviewed values and provenance for one verified row. Selection lives on the outcome, not here. */
export interface ImportRowSnapshot {
  reviewedValues: ReviewedImportValues;
  provenance: ImportRowProvenance;
}

export const IMPORT_FINALIZE_PREVIEW_OUTCOME_VALUES = [
  'created',
  'matched',
] as const;

export type ImportFinalizePreviewOutcome =
  (typeof IMPORT_FINALIZE_PREVIEW_OUTCOME_VALUES)[number];

export type ImportOutcomeCounts = Record<ImportRowOutcome, number>;

export const countImportOutcomes = (
  outcomes: readonly { outcome: ImportRowOutcome }[]
): ImportOutcomeCounts => {
  const counts: ImportOutcomeCounts = {
    created: 0,
    matched: 0,
    skipped: 0,
    invalid: 0,
  };
  for (const { outcome } of outcomes) counts[outcome] += 1;
  return counts;
};

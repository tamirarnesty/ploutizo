import type {
  ImportBatchStatus,
  ImportPreparedOutcome,
  ImportRowStatus,
  ImportTransactionType,
  MerchantMatchType,
} from './enums';
import type { FinancialInstitutionId } from './financial-institutions';
import type {
  ImportContentProfileId,
  ImportUploadMappingRequired,
} from './import-formats';

/** Review-field blockers from the shared import draft evaluator. */
export type ImportRowReviewBlocker =
  | 'date'
  | 'amount'
  | 'description'
  | 'type'
  | 'category'
  | 'assignee'
  | 'settlement'
  | 'refund_link';

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

export interface ImportTargetAccount {
  id: string;
  name: string;
  institutionId: FinancialInstitutionId | null;
  lastFour: string | null;
}

export interface ImportDraftSummary {
  id: string;
  account: ImportTargetAccount;
  /** Content profile used to parse the uploaded CSV; null for custom-mapped uploads. */
  contentProfileId: ImportContentProfileId | null;
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

/** Server-loaded facts for existing-expense refund link validation. */
export interface RefundTargetFact {
  id: string;
  accountId: string;
  amount: number;
  categoryId: string | null;
  assigneeMemberIds: string[];
  type: string;
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
  /**
   * Same-import refund target (draft row id). Evaluated on the working copy;
   * not yet persisted — omitted from `ImportDraftPersistedRow` until the DB column lands.
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

/** Durable import draft row persisted in Postgres — no derived status fields. */
export type ImportDraftPersistedRow = Omit<
  ImportDraftRow,
  'status' | 'invalidReason' | 'reviewRefundOfBatchRowId'
>;

export interface ImportDraft extends ImportDraftSummary {
  rows: ImportDraftRow[];
  refundTargetFacts: Record<string, RefundTargetFact>;
}

export type CreateImportDraftResponse =
  | {
      kind: 'draft';
      data: ImportDraft;
      meta: { reusedExisting: boolean };
    }
  | ImportUploadMappingRequired;

export interface UpdateImportDraftRowResult {
  row: ImportDraftPersistedRow;
  refundTargetFacts?: Record<string, RefundTargetFact>;
}

/** Per-row blocker payload when Continue rejects under the prepared-set lock. */
export interface ImportContinueNotReadyRow {
  batchRowId: string;
  status: ImportRowStatus;
  blockers: ImportRowReviewBlocker[];
  invalidReason: string | null;
}

export interface ImportContinueNotReadyDetails {
  rows: ImportContinueNotReadyRow[];
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

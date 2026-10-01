import {
  FINANCIAL_INSTITUTION_IDS,
  IMPORT_BATCH_STATUS_VALUES,
  IMPORT_CONTENT_PROFILE_IDS,
  IMPORT_CUSTOM_MAPPING_DATE_FORMATS,
  IMPORT_FINALIZE_PREVIEW_OUTCOME_VALUES,
  IMPORT_ROW_OUTCOME_VALUES,
  IMPORT_ROW_STATUS_VALUES,
  IMPORT_TRANSACTION_LINK_OUTCOME_VALUES,
  IMPORT_TRANSACTION_TYPE_VALUES,
} from '@ploutizo/types';
import { z } from 'zod';
import type {
  ImportDraftRow,
  ImportReviewRow,
  ImportRowProvenance,
  ImportRowSnapshot,
  MatchTargetFact,
  ReviewedImportValues,
} from '@ploutizo/types';
import { assertSchemaOutput, isoTimestampSchema } from './shared';

const importTransactionTypeSchema = z.enum(IMPORT_TRANSACTION_TYPE_VALUES);
const importRowStatusSchema = z.enum(IMPORT_ROW_STATUS_VALUES);

/** Full import draft row as returned by GET draft (derived status fields included). */
export const importDraftRowSchema = z.object({
  id: z.string().min(1),
  batchId: z.string().min(1),
  rowNumber: z.number().int().positive(),
  status: importRowStatusSchema,
  invalidReason: z.string().nullable(),
  rawData: z.record(z.string(), z.string()),
  externalId: z.string().nullable(),
  sourceDate: z.string().nullable(),
  sourceAmount: z.string().nullable(),
  sourceDescription: z.string().nullable(),
  sourceType: z.string().nullable(),
  parsedDate: z.iso.date().nullable(),
  parsedAmount: z.number().int().nullable(),
  parsedType: importTransactionTypeSchema.nullable(),
  parsedDescription: z.string().nullable(),
  reviewDate: z.string().nullable(),
  reviewAmount: z.number().nullable(),
  reviewType: importTransactionTypeSchema.nullable(),
  reviewDescription: z.string().nullable(),
  reviewCategoryId: z.string().nullable(),
  reviewAssigneeMemberIds: z.array(z.string()),
  reviewCounterpartAccountId: z.string().nullable(),
  reviewRefundOf: z.string().nullable(),
  reviewRefundOfBatchRowId: z.string().nullable(),
  reviewRefundLinkHint: z.string().nullable(),
  reviewMatchedTransactionId: z.string().nullable(),
  reviewMatchDismissed: z.boolean(),
  reviewNotes: z.string().nullable(),
  reviewTagIds: z.array(z.string()),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

assertSchemaOutput<typeof importDraftRowSchema, ImportDraftRow>();

/** Review working-copy row (durable fields + session-only selection). */
export const importReviewRowSchema = importDraftRowSchema.extend({
  selectedForImport: z.boolean(),
});

assertSchemaOutput<typeof importReviewRowSchema, ImportReviewRow>();

// ---------------------------------------------------------------------------
// Content selection schemas
// ---------------------------------------------------------------------------

const importAmountSemanticsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('signed'),
    column: z.string().min(1),
    positiveIsExpense: z.boolean(),
  }),
  z.object({
    kind: z.literal('debit_credit'),
    debitColumn: z.string().min(1),
    creditColumn: z.string().min(1),
  }),
]);

const importCustomMappingSchema = z
  .object({
    dateColumn: z.string().min(1),
    dateFormat: z.enum(IMPORT_CUSTOM_MAPPING_DATE_FORMATS),
    descriptionColumn: z.string().min(1),
    amount: importAmountSemanticsSchema,
    externalIdColumn: z.string().min(1).optional(),
  })
  .refine(
    (mapping) =>
      mapping.amount.kind !== 'debit_credit' ||
      mapping.amount.debitColumn !== mapping.amount.creditColumn,
    { message: 'Debit and credit columns must be different.', path: ['amount'] }
  );

export const importContentSelectionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('profile'),
    profileId: z.enum(IMPORT_CONTENT_PROFILE_IDS),
  }),
  z.object({
    kind: z.literal('mapping'),
    mapping: importCustomMappingSchema,
  }),
]);

export type ImportContentSelectionInput = z.infer<
  typeof importContentSelectionSchema
>;

// ---------------------------------------------------------------------------
// Draft creation
// ---------------------------------------------------------------------------

export const createImportDraftSchema = z.object({
  accountId: z.string().uuid(),
  fileName: z.string().trim().min(1, 'File name is required.').max(255),
  content: z.string().min(1, 'CSV file is empty.'),
  selection: importContentSelectionSchema.optional(),
});

export const updateImportDraftRowSchema = z
  .object({
    reviewDate: z.iso.date().nullable().optional(),
    reviewAmount: z.number().int().positive().nullable().optional(),
    reviewType: importTransactionTypeSchema.nullable().optional(),
    reviewDescription: z.string().trim().min(1).nullable().optional(),
    reviewCategoryId: z.string().uuid().nullable().optional(),
    reviewAssigneeMemberIds: z.array(z.string().uuid()).optional(),
    reviewCounterpartAccountId: z.string().uuid().nullable().optional(),
    reviewRefundOf: z.string().uuid().nullable().optional(),
    reviewRefundOfBatchRowId: z.string().uuid().nullable().optional(),
    reviewRefundLinkHint: z.string().trim().min(1).nullable().optional(),
    reviewMatchedTransactionId: z.string().uuid().nullable().optional(),
    reviewMatchDismissed: z.boolean().optional(),
    reviewNotes: z.string().trim().nullable().optional(),
    reviewTagIds: z.array(z.string().uuid()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export type CreateImportDraftInput = z.infer<typeof createImportDraftSchema>;
export type UpdateImportDraftRowInput = z.infer<
  typeof updateImportDraftRowSchema
>;

const importDraftRowIdSchema = z.object({
  id: z.string().uuid(),
});

export const batchUpdateImportDraftRowsSchema = z.object({
  rows: z.array(importDraftRowIdSchema.and(updateImportDraftRowSchema)).min(1),
});

export type BatchUpdateImportDraftRowsInput = z.infer<
  typeof batchUpdateImportDraftRowsSchema
>;

export const continueImportDraftSchema = z.object({
  rowIds: z.array(z.string().uuid()).min(1),
});

export type ContinueImportDraftInput = z.infer<
  typeof continueImportDraftSchema
>;

export const finalizeImportDraftSchema = z.object({
  rowIds: z.array(z.string().uuid()).min(1),
});

export type FinalizeImportDraftInput = z.infer<
  typeof finalizeImportDraftSchema
>;

export const importHistoryQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type ImportHistoryQueryInput = z.infer<typeof importHistoryQuerySchema>;

export const importTransactionLinkOutcomeSchema = z.enum(
  IMPORT_TRANSACTION_LINK_OUTCOME_VALUES
);

export const importTransactionLinkFilterSchema = z.object({
  batchId: z.string().uuid(),
  outcome: importTransactionLinkOutcomeSchema,
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/** Durable draft row as persisted — no derived status fields (`PATCH …/rows` body). */
export const importDraftPersistedRowSchema = importDraftRowSchema.omit({
  status: true,
  invalidReason: true,
});

export type ImportDraftPersistedRow = z.infer<
  typeof importDraftPersistedRowSchema
>;

/** `GET /api/imports/targets` row. */
export const importTargetAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  institutionId: z.enum(FINANCIAL_INSTITUTION_IDS).nullable(),
  lastFour: z.string().nullable(),
});

export type ImportTargetAccount = z.infer<typeof importTargetAccountSchema>;

/** `GET /api/imports/drafts` row. */
export const importDraftSummarySchema = z.object({
  id: z.string(),
  account: importTargetAccountSchema,
  /** Content profile used to parse the uploaded CSV; null for custom-mapped uploads. */
  contentProfileId: z.enum(IMPORT_CONTENT_PROFILE_IDS).nullable(),
  status: z.enum(IMPORT_BATCH_STATUS_VALUES),
  fileName: z.string().nullable(),
  rowCount: z.number().int(),
  validRowCount: z.number().int(),
  invalidRowCount: z.number().int(),
  importedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema.nullable(),
  discardedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ImportDraftSummary = z.infer<typeof importDraftSummarySchema>;

/** Server-loaded facts for existing-expense refund link validation. */
export const refundTargetFactSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  amount: z.number().int(),
  categoryId: z.string().nullable(),
  assigneeMemberIds: z.array(z.string()),
  /** A transaction type; typed as the ledger fact the API loads (`string`). */
  type: z.string(),
  deleted: z.boolean(),
});

export type RefundTargetFact = z.infer<typeof refundTargetFactSchema>;

/** Keyed by transaction id. */
const refundTargetFactsSchema = z.record(z.string(), refundTargetFactSchema);

/** Existing ledger row used for import match and refund-link suggestions. */
export const matchTargetFactSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: z.string(),
  date: z.iso.date(),
  amount: z.number().int(),
  description: z.string(),
  rawDescription: z.string().nullable(),
  externalId: z.string().nullable(),
  deleted: z.boolean(),
});

assertSchemaOutput<typeof matchTargetFactSchema, MatchTargetFact>();

/** `GET /api/imports/drafts/:id` body. */
export const importDraftSchema = importDraftSummarySchema.extend({
  rows: z.array(importDraftRowSchema),
  refundTargetFacts: refundTargetFactsSchema,
  /** Keyed by transaction id. */
  matchTargetFacts: z.record(z.string(), matchTargetFactSchema),
  /** Posted refund totals (cents) per `tx:${transactionId}` for cross-import caps. */
  priorRefundsByTarget: z.record(z.string(), z.number().int()),
});

export type ImportDraft = z.infer<typeof importDraftSchema>;

/** Upload that needs a content profile or custom column mapping before it can become a draft. */
export const importUploadMappingRequiredSchema = z.object({
  kind: z.literal('mapping_required'),
  /** Known profiles that match this file; empty when only custom mapping applies. */
  candidateProfileIds: z.array(z.enum(IMPORT_CONTENT_PROFILE_IDS)),
  /** Column lookup keys: header names, or `Column N` for headerless files. */
  columns: z.array(z.string()),
  /** First data rows, for the mapping preview. */
  sampleRows: z.array(z.array(z.string())),
});

export type ImportUploadMappingRequired = z.infer<
  typeof importUploadMappingRequiredSchema
>;

/** `POST /api/imports/drafts` body — bare, discriminated on `kind`. */
export const createImportDraftResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('draft'),
    data: importDraftSchema,
    meta: z.object({ reusedExisting: z.boolean() }),
  }),
  importUploadMappingRequiredSchema,
]);

export type CreateImportDraftResponse = z.infer<
  typeof createImportDraftResponseSchema
>;

/** `PATCH /api/imports/drafts/:id/rows` body; `refundTargetFacts` is omitted when there are none. */
export const updateImportDraftRowsResponseSchema = z.object({
  data: z.array(importDraftPersistedRowSchema),
  refundTargetFacts: refundTargetFactsSchema.optional(),
});

/** Batch row PATCH outcome as the API service returns it and the web review session consumes it. */
export interface BatchUpdateImportDraftRowsResult {
  rows: ImportDraftPersistedRow[];
  refundTargetFacts?: Record<string, RefundTargetFact>;
}

/** One row of a batch PATCH, as the review session reconciles it. */
export interface UpdateImportDraftRowResult {
  row: ImportDraftPersistedRow;
  refundTargetFacts?: Record<string, RefundTargetFact>;
}

const reviewedImportValuesSchema = z.object({
  date: z.iso.date().nullable(),
  amount: z.number().int().nullable(),
  type: importTransactionTypeSchema.nullable(),
  description: z.string().nullable(),
  categoryId: z.string().nullable(),
  assigneeMemberIds: z.array(z.string()),
  counterpartAccountId: z.string().nullable(),
  refundOf: z.string().nullable(),
  refundOfBatchRowId: z.string().nullable(),
  notes: z.string().nullable(),
  tagIds: z.array(z.string()),
});

assertSchemaOutput<typeof reviewedImportValuesSchema, ReviewedImportValues>();

const importRowProvenanceSchema = z.object({
  externalId: z.string().nullable(),
  rawDescription: z.string().nullable(),
  parsedDescription: z.string().nullable(),
});

assertSchemaOutput<typeof importRowProvenanceSchema, ImportRowProvenance>();

const importRowSnapshotSchema = z.object({
  reviewedValues: reviewedImportValuesSchema,
  provenance: importRowProvenanceSchema,
});

assertSchemaOutput<typeof importRowSnapshotSchema, ImportRowSnapshot>();

export const importFinalizePreviewRowSchema = z.object({
  batchRowId: z.string(),
  outcome: z.enum(IMPORT_FINALIZE_PREVIEW_OUTCOME_VALUES),
  transactionId: z.string().nullable(),
  snapshot: importRowSnapshotSchema,
});

export type ImportFinalizePreviewRow = z.infer<
  typeof importFinalizePreviewRowSchema
>;

/** `POST …/continue` body — stateless full-file outcome projection for Finalize import. */
export const importFinalizePreviewSchema = z.object({
  batchId: z.string(),
  rowCount: z.number().int(),
  counts: z.record(z.enum(IMPORT_ROW_OUTCOME_VALUES), z.number().int()),
  created: z.array(importFinalizePreviewRowSchema),
  matched: z.array(importFinalizePreviewRowSchema),
});

export type ImportFinalizePreview = z.infer<typeof importFinalizePreviewSchema>;

/** Identity facts shared by completed and discarded Import history. */
const importHistoryIdentitySchema = z.object({
  id: z.string(),
  account: importTargetAccountSchema,
  contentProfileId: z.enum(IMPORT_CONTENT_PROFILE_IDS).nullable(),
  fileName: z.string().nullable(),
  rowCount: z.number().int(),
  importedAt: isoTimestampSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type ImportHistoryIdentity = z.infer<typeof importHistoryIdentitySchema>;

/** Durable completed-result facts recorded when Finalize succeeds (`POST …/finalize` body). */
export const importCompletedHistoryItemSchema =
  importHistoryIdentitySchema.extend({
    status: z.literal('completed'),
    completedAt: isoTimestampSchema,
    discardedAt: z.null(),
    createdCount: z.number().int(),
    matchedCount: z.number().int(),
    skippedCount: z.number().int(),
    invalidCount: z.number().int(),
  });

export type ImportCompletedHistoryItem = z.infer<
  typeof importCompletedHistoryItemSchema
>;
export type ImportCompletedResult = ImportCompletedHistoryItem;

/** Discarded history: lifecycle/source facts only — no synthesized outcome counts. */
const importDiscardedHistoryItemSchema = importHistoryIdentitySchema.extend({
  status: z.literal('discarded'),
  completedAt: z.null(),
  discardedAt: isoTimestampSchema,
});

export type ImportDiscardedHistoryItem = z.infer<
  typeof importDiscardedHistoryItemSchema
>;

const importHistoryItemSchema = z.discriminatedUnion('status', [
  importCompletedHistoryItemSchema,
  importDiscardedHistoryItemSchema,
]);

export type ImportHistoryItem = z.infer<typeof importHistoryItemSchema>;

/** `GET /api/imports/history` body — bare page with an opaque cursor. */
export const importHistoryPageSchema = z.object({
  data: z.array(importHistoryItemSchema),
  nextCursor: z.string().nullable(),
});

export type ImportHistoryPage = z.infer<typeof importHistoryPageSchema>;

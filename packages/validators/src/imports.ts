import {
  IMPORT_CONTENT_PROFILE_IDS,
  IMPORT_CUSTOM_MAPPING_DATE_FORMATS,
  IMPORT_ROW_STATUS_VALUES,
  IMPORT_TRANSACTION_LINK_OUTCOME_VALUES,
  IMPORT_TRANSACTION_TYPE_VALUES,
} from '@ploutizo/types';
import { z } from 'zod';

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
  parsedDate: z.string().nullable(),
  parsedAmount: z.number().nullable(),
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
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Review working-copy row (durable fields + session-only selection). */
export const importReviewRowSchema = importDraftRowSchema.extend({
  selectedForImport: z.boolean(),
});

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

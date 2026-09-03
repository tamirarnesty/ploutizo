import {
  IMPORT_CONTENT_PROFILE_IDS,
  IMPORT_CUSTOM_MAPPING_DATE_FORMATS,
  IMPORT_PREPARED_OUTCOME_VALUES,
  IMPORT_TRANSACTION_TYPE_VALUES,
} from '@ploutizo/types';
import { z } from 'zod';

const importTransactionTypeSchema = z.enum(IMPORT_TRANSACTION_TYPE_VALUES);

// ---------------------------------------------------------------------------
// Content selection schemas
// ---------------------------------------------------------------------------

const importAmountSemanticsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('signed'),
    positiveIsExpense: z.boolean(),
  }),
  z.object({
    kind: z.literal('debit_credit'),
    debitColumn: z.string().min(1),
    creditColumn: z.string().min(1),
  }),
]);

const importCustomMappingSchema = z.object({
  dateColumn: z.string().min(1),
  dateFormat: z.enum(IMPORT_CUSTOM_MAPPING_DATE_FORMATS),
  descriptionColumn: z.string().min(1),
  amount: importAmountSemanticsSchema,
  externalIdColumn: z.string().min(1).optional(),
});

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
// Inspection
// ---------------------------------------------------------------------------

export const inspectImportUploadSchema = z.object({
  content: z.string().min(1, 'CSV file is empty.'),
});

export type InspectImportUploadInput = z.infer<
  typeof inspectImportUploadSchema
>;

// ---------------------------------------------------------------------------
// Draft creation (now requires a confirmed selection)
// ---------------------------------------------------------------------------

export const createImportDraftSchema = z.object({
  accountId: z.string().uuid(),
  fileName: z.string().trim().min(1, 'File name is required.').max(255),
  content: z.string().min(1, 'CSV file is empty.'),
  selection: importContentSelectionSchema,
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
    reviewRefundLinkHint: z.string().trim().min(1).nullable().optional(),
    reviewNotes: z.string().trim().nullable().optional(),
    reviewTagIds: z.array(z.string().uuid()).optional(),
    selectedForImport: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export type CreateImportDraftInput = z.infer<typeof createImportDraftSchema>;
export type UpdateImportDraftRowInput = z.infer<
  typeof updateImportDraftRowSchema
>;

export const updateImportDraftRowSelectionSchema = z.object({
  rowIds: z.array(z.string().uuid()).min(1),
  selectedForImport: z.boolean(),
});

export type UpdateImportDraftRowSelectionInput = z.infer<
  typeof updateImportDraftRowSelectionSchema
>;

/** Runtime contract for immutable prepared-set reviewed-value snapshots. */
export const importPreparedReviewedValuesSchema = z.object({
  date: z.string().nullable(),
  amount: z.number().int().nullable(),
  type: importTransactionTypeSchema.nullable(),
  description: z.string().nullable(),
  categoryId: z.string().uuid().nullable(),
  assigneeMemberIds: z.array(z.string().uuid()),
  counterpartAccountId: z.string().uuid().nullable(),
  refundOf: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  tagIds: z.array(z.string().uuid()),
  externalId: z.string().nullable(),
  rawDescription: z.string().nullable(),
  selectedForImport: z.boolean(),
});

export type ImportPreparedReviewedValuesInput = z.infer<
  typeof importPreparedReviewedValuesSchema
>;

export const importPreparedOutcomeSchema = z.enum(
  IMPORT_PREPARED_OUTCOME_VALUES
);

/** Caller-supplied prepare outcome; server owns the reviewedValues snapshot. */
export const prepareImportOutcomeSchema = z.object({
  batchRowId: z.string().uuid(),
  outcome: importPreparedOutcomeSchema,
  transactionId: z.string().uuid().nullable().optional(),
});

export type PrepareImportOutcomeInput = z.infer<
  typeof prepareImportOutcomeSchema
>;

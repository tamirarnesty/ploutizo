import { IMPORT_ROW_STATUS_VALUES } from '@ploutizo/types'
import { z } from 'zod'

const importTransactionTypeSchema = z.enum(['expense', 'refund', 'settlement'])

export const createImportDraftSchema = z.object({
  accountId: z.string().uuid(),
  fileName: z.string().trim().min(1, 'File name is required.').max(255),
  content: z.string().min(1, 'CSV file is empty.'),
})

export const updateImportDraftRowSchema = z
  .object({
    status: z.enum(IMPORT_ROW_STATUS_VALUES).optional(),
    reviewDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
      .nullable()
      .optional(),
    reviewAmount: z.number().int().positive().nullable().optional(),
    reviewType: importTransactionTypeSchema.nullable().optional(),
    reviewDescription: z.string().trim().min(1).nullable().optional(),
    reviewCategoryName: z.string().trim().min(1).nullable().optional(),
    reviewAssigneeHint: z.string().trim().min(1).nullable().optional(),
    reviewRefundLinkHint: z.string().trim().min(1).nullable().optional(),
    reviewNotes: z.string().trim().nullable().optional(),
    reviewTags: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

export type CreateImportDraftInput = z.infer<typeof createImportDraftSchema>
export type UpdateImportDraftRowInput = z.infer<
  typeof updateImportDraftRowSchema
>

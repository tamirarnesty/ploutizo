import { z } from 'zod'

export const createMerchantRuleSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required.'),
  matchType: z.enum(['exact', 'contains', 'starts_with', 'ends_with', 'regex']),
  renameTo: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.number().int().optional().default(100),
})
export const updateMerchantRuleSchema = createMerchantRuleSchema.partial()

export type CreateMerchantRuleInput = z.infer<typeof createMerchantRuleSchema>
export type UpdateMerchantRuleInput = z.infer<typeof updateMerchantRuleSchema>

// RuleFormSchema — API schema minus assigneeId and priority (set server-side)
// categoryId is z.string().uuid().nullable().optional() — null means no category (D-06)
export const RuleFormSchema = createMerchantRuleSchema
  .omit({ assigneeId: true, priority: true })
  .extend({
    pattern: z.string().min(1, 'Pattern is required.'),
  })
export type RuleForm = z.infer<typeof RuleFormSchema>

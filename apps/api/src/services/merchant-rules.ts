import { db } from '@ploutizo/db'
import { DomainError, NotFoundError } from '../lib/errors'
import {
  deleteMerchantRule as deleteMerchantRuleQuery,
  insertMerchantRule,
  listMerchantRules as listMerchantRulesQuery,
  reorderMerchantRules as reorderMerchantRulesQuery,
  updateMerchantRule as updateMerchantRuleQuery,
} from '../lib/queries/merchant-rules'
import type { createMerchantRuleSchema, updateMerchantRuleSchema } from '@ploutizo/validators'
import type { z } from 'zod'

// Moved from routes/merchant-rules.ts per D-06 — business logic belongs in service
function validateRegex(matchType: string, pattern: string): void {
  if (matchType !== 'regex') return
  try {
    new RegExp(pattern)
  } catch {
    throw new DomainError(400, 'Invalid regular expression.')
  }
}

export async function reorderMerchantRules(orgId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    await reorderMerchantRulesQuery(tx, orgId, orderedIds)
  })
}

export async function listMerchantRules(orgId: string) {
  return listMerchantRulesQuery(orgId)
}

export async function createMerchantRule(
  orgId: string,
  data: z.infer<typeof createMerchantRuleSchema>
) {
  validateRegex(data.matchType, data.pattern)
  return insertMerchantRule(orgId, data)
}

export async function updateMerchantRule(
  id: string,
  orgId: string,
  data: z.infer<typeof updateMerchantRuleSchema>
) {
  if (data.matchType && data.pattern) {
    validateRegex(data.matchType, data.pattern)
  }
  const updated = await updateMerchantRuleQuery(id, orgId, data)
  if (!updated) throw new NotFoundError('Rule not found.')
  return updated
}

export async function deleteMerchantRule(id: string, orgId: string) {
  await deleteMerchantRuleQuery(id, orgId)
}

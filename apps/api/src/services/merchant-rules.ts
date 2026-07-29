import { db } from '@ploutizo/db';
import { isValidMerchantRegexPattern } from '@ploutizo/utils';
import type {
  createMerchantRuleSchema,
  updateMerchantRuleSchema,
} from '@ploutizo/validators';
import { DomainError, NotFoundError } from '../lib/errors';
import {
  deleteMerchantRule as deleteMerchantRuleQuery,
  insertMerchantRule,
  listMerchantRules as listMerchantRulesQuery,
  reorderMerchantRules as reorderMerchantRulesQuery,
  updateMerchantRule as updateMerchantRuleQuery,
} from '../lib/queries/merchant-rules';
import type { z } from 'zod';

// Moved from routes/merchant-rules.ts per D-06 — business logic belongs in service
const validateRegex = (matchType: string, pattern: string): void => {
  if (matchType !== 'regex') return;
  if (!isValidMerchantRegexPattern(pattern)) {
    throw new DomainError(
      400,
      'Regular expression is invalid or too long.',
      'INVALID_REGEX'
    );
  }
};

export const reorderMerchantRules = async (
  orgId: string,
  orderedIds: string[]
) => {
  await db.transaction(async (tx) => {
    await reorderMerchantRulesQuery(tx, orgId, orderedIds);
  });
};

export const listMerchantRules = async (orgId: string) => {
  return listMerchantRulesQuery(orgId);
};

export const createMerchantRule = async (
  orgId: string,
  data: z.infer<typeof createMerchantRuleSchema>
) => {
  validateRegex(data.matchType, data.pattern);
  return insertMerchantRule(orgId, data);
};

export const updateMerchantRule = async (
  id: string,
  orgId: string,
  data: z.infer<typeof updateMerchantRuleSchema>
) => {
  if (data.pattern !== undefined || data.matchType === 'regex') {
    let matchType = data.matchType;
    let pattern = data.pattern;
    if (matchType === undefined || pattern === undefined) {
      const existing = (await listMerchantRulesQuery(orgId)).find(
        (rule) => rule.id === id
      );
      if (!existing) throw new NotFoundError('Rule not found.');
      matchType ??= existing.matchType;
      pattern ??= existing.pattern;
    }
    validateRegex(matchType, pattern);
  }

  const updated = await updateMerchantRuleQuery(id, orgId, data);
  if (!updated) throw new NotFoundError('Rule not found.');
  return updated;
};

export const deleteMerchantRule = async (id: string, orgId: string) => {
  await deleteMerchantRuleQuery(id, orgId);
};

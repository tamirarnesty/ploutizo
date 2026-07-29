import { db } from '@ploutizo/db';
import { merchantRules, merchantRuleTags } from '@ploutizo/db/schema';
import { eq } from 'drizzle-orm';
import type { ClassifyMerchantRule } from '@ploutizo/utils';

/** Merchant rules with tag ids, ordered by ascending priority (first match wins). */
export const listMerchantRulesForClassification = async (
  orgId: string
): Promise<ClassifyMerchantRule[]> => {
  const rules = await db
    .select({
      id: merchantRules.id,
      pattern: merchantRules.pattern,
      matchType: merchantRules.matchType,
      renameTo: merchantRules.renameTo,
      categoryId: merchantRules.categoryId,
      assigneeId: merchantRules.assigneeId,
    })
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId))
    .orderBy(merchantRules.priority);

  if (rules.length === 0) return [];

  const tagRows = await db
    .select({
      ruleId: merchantRuleTags.ruleId,
      tagId: merchantRuleTags.tagId,
    })
    .from(merchantRuleTags)
    .innerJoin(merchantRules, eq(merchantRules.id, merchantRuleTags.ruleId))
    .where(eq(merchantRules.orgId, orgId));

  const tagsByRule = new Map<string, string[]>();
  for (const row of tagRows) {
    const existing = tagsByRule.get(row.ruleId) ?? [];
    existing.push(row.tagId);
    tagsByRule.set(row.ruleId, existing);
  }

  return rules.map((rule) => ({
    pattern: rule.pattern,
    matchType: rule.matchType,
    renameTo: rule.renameTo,
    categoryId: rule.categoryId,
    assigneeId: rule.assigneeId,
    tagIds: tagsByRule.get(rule.id) ?? [],
  }));
};

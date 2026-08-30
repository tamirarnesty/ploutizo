import { db } from '@ploutizo/db';
import { merchantRuleTags, merchantRules } from '@ploutizo/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { Transaction } from '@ploutizo/db';

// PATCH /reorder — update priority for each id in sequence
export const reorderMerchantRules = async (
  tx: Transaction,
  orgId: string,
  orderedIds: string[]
) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await tx
      .update(merchantRules)
      .set({ priority: i })
      .where(
        and(eq(merchantRules.id, orderedIds[i]), eq(merchantRules.orgId, orgId))
      );
  }
};

// GET / — list all rules for org ordered by priority
export const listMerchantRules = async (orgId: string) => {
  return db
    .select()
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId))
    .orderBy(merchantRules.priority);
};

export const listMerchantRulesWithTags = async (orgId: string) => {
  const rules = await listMerchantRules(orgId);
  if (rules.length === 0) return [];

  const tagRows = await db
    .select({
      ruleId: merchantRuleTags.ruleId,
      tagId: merchantRuleTags.tagId,
    })
    .from(merchantRuleTags)
    .where(
      inArray(
        merchantRuleTags.ruleId,
        rules.map((rule) => rule.id)
      )
    );

  const tagIdsByRule = new Map<string, string[]>();
  for (const row of tagRows) {
    const tagIds = tagIdsByRule.get(row.ruleId) ?? [];
    tagIds.push(row.tagId);
    tagIdsByRule.set(row.ruleId, tagIds);
  }

  return rules.map((rule) => ({
    pattern: rule.pattern,
    matchType: rule.matchType,
    renameTo: rule.renameTo,
    categoryId: rule.categoryId,
    assigneeId: rule.assigneeId,
    tagIds: tagIdsByRule.get(rule.id) ?? [],
  }));
};

// POST / — insert rule; returns inserted row
export const insertMerchantRule = async (
  orgId: string,
  data: Omit<
    typeof merchantRules.$inferInsert,
    'orgId' | 'id' | 'createdAt' | 'updatedAt'
  >
) => {
  const [row] = await db
    .insert(merchantRules)
    .values({ orgId, ...data })
    .returning();
  return row;
};

// PATCH /:id — update rule fields; returns updated row or null
export const updateMerchantRule = async (
  id: string,
  orgId: string,
  data: Partial<typeof merchantRules.$inferInsert>
) => {
  const rows = await db
    .update(merchantRules)
    .set(data)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId)))
    .returning();
  return rows.at(0) ?? null;
};

// DELETE /:id — hard delete rule
export const deleteMerchantRule = async (id: string, orgId: string) => {
  const rows = await db
    .delete(merchantRules)
    .where(and(eq(merchantRules.id, id), eq(merchantRules.orgId, orgId)))
    .returning({ id: merchantRules.id });
  return rows.at(0) ?? null;
};

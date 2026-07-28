import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { categories, merchantRules } from '../schema/index';

type SelectExecutor = { select: typeof db.select };
type InsertExecutor = { insert: typeof db.insert };
type SeedExecutor = SelectExecutor & InsertExecutor;

// Default merchant rules seeded at org creation.
// INVARIANT: Every row has orgId set — no global merchant rule rows.
// Schema uses `pattern` (not matchValue) and `renameTo` (not renameDescription).
const DEFAULT_MERCHANT_RULES: {
  name: string;
  matchType: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
  pattern: string;
  renameTo: string | null;
  priority: number;
}[] = [
  {
    name: 'Tim Hortons',
    matchType: 'contains',
    pattern: 'TIM HORTONS',
    renameTo: 'Tim Hortons',
    priority: 0,
  },
  {
    name: 'Starbucks',
    matchType: 'contains',
    pattern: 'STARBUCKS',
    renameTo: 'Starbucks',
    priority: 1,
  },
  {
    name: 'Amazon',
    matchType: 'contains',
    pattern: 'AMAZON',
    renameTo: 'Amazon',
    priority: 2,
  },
  {
    name: 'Netflix',
    matchType: 'exact',
    pattern: 'NETFLIX.COM',
    renameTo: 'Netflix',
    priority: 3,
  },
  {
    name: 'Spotify',
    matchType: 'exact',
    pattern: 'SPOTIFY',
    renameTo: 'Spotify',
    priority: 4,
  },
];

const BILL_PAYMENT_RULE = {
  matchType: 'contains' as const,
  pattern: 'PAYMENT THANK YOU',
  renameTo: BILL_PAYMENT_CATEGORY_NAME,
  priority: 5,
};

export const insertSeedMerchantRulesForOrg = async (
  executor: InsertExecutor,
  orgId: string
): Promise<void> => {
  await executor.insert(merchantRules).values(
    DEFAULT_MERCHANT_RULES.map((rule) => ({
      orgId, // non-nullable — always set to the passed orgId
      pattern: rule.pattern,
      matchType: rule.matchType,
      renameTo: rule.renameTo,
      priority: rule.priority,
    }))
  );
};

export const ensureBillPaymentMerchantRuleForOrg = async (
  executor: SeedExecutor,
  orgId: string
): Promise<void> => {
  const [billPaymentCategory] = await executor
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.orgId, orgId),
        eq(categories.name, BILL_PAYMENT_CATEGORY_NAME)
      )
    )
    .limit(1);

  if (!billPaymentCategory) return;

  const [existingRule] = await executor
    .select({ id: merchantRules.id })
    .from(merchantRules)
    .where(
      and(
        eq(merchantRules.orgId, orgId),
        eq(merchantRules.pattern, BILL_PAYMENT_RULE.pattern),
        eq(merchantRules.matchType, BILL_PAYMENT_RULE.matchType)
      )
    )
    .limit(1);

  if (existingRule) return;

  await executor.insert(merchantRules).values({
    orgId,
    pattern: BILL_PAYMENT_RULE.pattern,
    matchType: BILL_PAYMENT_RULE.matchType,
    renameTo: BILL_PAYMENT_RULE.renameTo,
    categoryId: billPaymentCategory.id,
    priority: BILL_PAYMENT_RULE.priority,
  });
};

export const seedOrgMerchantRules = async (orgId: string): Promise<void> => {
  await insertSeedMerchantRulesForOrg(db, orgId);
};

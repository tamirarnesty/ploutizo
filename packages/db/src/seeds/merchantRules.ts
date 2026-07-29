import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { merchantRules } from '../schema/index';
import { findBillPaymentCategoryId } from './categories';

type SelectExecutor = { select: typeof db.select };
type InsertExecutor = { insert: typeof db.insert };
type SeedExecutor = SelectExecutor & InsertExecutor;

/** Pattern used for seeded bill-payment merchant classification. */
export const BILL_PAYMENT_MERCHANT_RULE_PATTERN = 'PAYMENT THANK YOU' as const;

// Default merchant rules seeded at org creation.
// INVARIANT: Every row has orgId set — no global merchant rule rows.
// Schema uses `pattern` (not matchValue) and `renameTo` (not renameDescription).
// Bill Payment is ensured separately so it can resolve categoryId after categories exist.
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
  pattern: BILL_PAYMENT_MERCHANT_RULE_PATTERN,
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

export const hasBillPaymentMerchantRule = async (
  executor: SelectExecutor,
  orgId: string
): Promise<boolean> => {
  const existingRule = (
    await executor
      .select({ id: merchantRules.id })
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.orgId, orgId),
          eq(merchantRules.pattern, BILL_PAYMENT_RULE.pattern),
          eq(merchantRules.matchType, BILL_PAYMENT_RULE.matchType)
        )
      )
      .limit(1)
  ).at(0);
  return Boolean(existingRule);
};

export const ensureBillPaymentMerchantRuleForOrg = async (
  executor: SeedExecutor,
  orgId: string
): Promise<void> => {
  const billPaymentCategoryId = await findBillPaymentCategoryId(
    executor,
    orgId
  );
  if (!billPaymentCategoryId) return;

  if (await hasBillPaymentMerchantRule(executor, orgId)) return;

  await executor.insert(merchantRules).values({
    orgId,
    pattern: BILL_PAYMENT_RULE.pattern,
    matchType: BILL_PAYMENT_RULE.matchType,
    renameTo: BILL_PAYMENT_RULE.renameTo,
    categoryId: billPaymentCategoryId,
    priority: BILL_PAYMENT_RULE.priority,
  });
};

export const seedOrgMerchantRules = async (orgId: string): Promise<void> => {
  await insertSeedMerchantRulesForOrg(db, orgId);
};

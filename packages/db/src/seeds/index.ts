import { count, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { categories, merchantRules } from '../schema';
import {
  ensureBillPaymentCategoryForOrg,
  hasBillPaymentCategory,
  insertSeedCategoriesForOrg,
} from './categories';
import {
  ensureBillPaymentMerchantRuleForOrg,
  hasBillPaymentMerchantRule,
  insertSeedMerchantRulesForOrg,
} from './merchantRules';

/**
 * Populate default categories and merchant rules for `orgId`.
 *
 * Concurrency: Drizzle does not expose Postgres advisory locks as a first-class
 * API. Alternatives considered: (1) `onConflictDoNothing` on every seed row —
 * works for categories (unique on org+name) but merchant rules lack a matching
 * unique key, so duplicate rows could still appear under parallel inserts;
 * (2) `SERIALIZABLE` — heavier and still relies on retry semantics; (3) a
 * dedicated lock row + `SELECT … FOR UPDATE` — extra schema. We use a short
 * transaction + `pg_advisory_xact_lock` keyed by `orgId` so all seed paths
 * serialize per org, re-count both tables after locking, then insert independently.
 *
 * Bill Payment category + merchant rule are ensured on every seed pass so orgs
 * created before import finalization still receive them.
 */
export const seedOrg = async (orgId: string): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(abs(hashtext(${orgId})::bigint))`
    );
    const [categoriesRow] = await tx
      .select({ n: count() })
      .from(categories)
      .where(eq(categories.orgId, orgId));
    const [rulesRow] = await tx
      .select({ n: count() })
      .from(merchantRules)
      .where(eq(merchantRules.orgId, orgId));

    if (Number(categoriesRow.n) === 0) {
      await insertSeedCategoriesForOrg(tx, orgId);
    } else {
      await ensureBillPaymentCategoryForOrg(tx, orgId);
    }
    if (Number(rulesRow.n) === 0) {
      await insertSeedMerchantRulesForOrg(tx, orgId);
    }
    await ensureBillPaymentMerchantRuleForOrg(tx, orgId);
  });
};

/**
 * Fast path when the org is already seeded (avoids opening a transaction).
 * `seedOrg` remains the single idempotent implementation under the advisory lock.
 * Runs full seed when categories/rules are missing or Bill Payment backfill is needed.
 */
export const ensureOrgSeeded = async (orgId: string): Promise<void> => {
  const [categoriesRow] = await db
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.orgId, orgId));
  const [rulesRow] = await db
    .select({ n: count() })
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId));

  if (Number(categoriesRow.n) === 0 || Number(rulesRow.n) === 0) {
    await seedOrg(orgId);
    return;
  }

  const [hasBillCategory, hasBillRule] = await Promise.all([
    hasBillPaymentCategory(db, orgId),
    hasBillPaymentMerchantRule(db, orgId),
  ]);

  if (hasBillCategory && hasBillRule) return;
  await seedOrg(orgId);
};

export {
  ensureBillPaymentCategoryForOrg,
  findBillPaymentCategoryId,
  hasBillPaymentCategory,
  insertSeedCategoriesForOrg,
  seedOrgCategories,
} from './categories';
export {
  BILL_PAYMENT_MERCHANT_RULE_PATTERN,
  ensureBillPaymentMerchantRuleForOrg,
  hasBillPaymentMerchantRule,
  insertSeedMerchantRulesForOrg,
  seedOrgMerchantRules,
} from './merchantRules';

import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { categories } from '../schema/index';

type SelectExecutor = { select: typeof db.select };
type InsertExecutor = {
  insert: typeof db.insert;
};

// Default categories seeded at org creation.
// INVARIANT: Every row has orgId set — no global category rows.
const DEFAULT_CATEGORIES: { name: string; icon: string; sortOrder: number }[] =
  [
    { name: 'Groceries', icon: 'ShoppingCart', sortOrder: 0 },
    { name: 'Dining & Restaurants', icon: 'UtensilsCrossed', sortOrder: 1 },
    { name: 'Transportation', icon: 'Car', sortOrder: 2 },
    { name: 'Housing & Rent', icon: 'Home', sortOrder: 3 },
    { name: 'Utilities', icon: 'Zap', sortOrder: 4 },
    { name: 'Healthcare', icon: 'HeartPulse', sortOrder: 5 },
    { name: 'Entertainment', icon: 'Tv', sortOrder: 6 },
    { name: 'Shopping', icon: 'ShoppingBag', sortOrder: 7 },
    { name: 'Travel', icon: 'Plane', sortOrder: 8 },
    { name: 'Personal Care', icon: 'Sparkles', sortOrder: 9 },
    { name: 'Other', icon: 'MoreHorizontal', sortOrder: 10 },
    {
      name: BILL_PAYMENT_CATEGORY_NAME,
      icon: 'CreditCard',
      sortOrder: 11,
    },
  ];

/** Insert default categories — use `db` from tests; `seedOrg` passes a transaction client. */
export const insertSeedCategoriesForOrg = async (
  executor: InsertExecutor,
  orgId: string
): Promise<void> => {
  await executor.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat) => ({
      orgId, // non-nullable — always set to the passed orgId
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    }))
  );
};

export const hasBillPaymentCategory = async (
  executor: SelectExecutor,
  orgId: string
): Promise<boolean> => {
  const row = (
    await executor
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.orgId, orgId),
          eq(categories.name, BILL_PAYMENT_CATEGORY_NAME)
        )
      )
      .limit(1)
  ).at(0);
  return Boolean(row);
};

/** Idempotent Bill Payment category for orgs seeded before import finalization. */
export const ensureBillPaymentCategoryForOrg = async (
  executor: InsertExecutor,
  orgId: string
): Promise<void> => {
  await executor
    .insert(categories)
    .values({
      orgId,
      name: BILL_PAYMENT_CATEGORY_NAME,
      icon: 'CreditCard',
      sortOrder: 11,
    })
    .onConflictDoNothing({
      target: [categories.orgId, categories.name],
    });
};

export const seedOrgCategories = async (orgId: string): Promise<void> => {
  await insertSeedCategoriesForOrg(db, orgId);
};

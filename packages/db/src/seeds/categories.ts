import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { categories } from '../schema/index';

type SelectExecutor = { select: typeof db.select };
type InsertExecutor = {
  insert: typeof db.insert;
};

const BILL_PAYMENT_CATEGORY = {
  name: BILL_PAYMENT_CATEGORY_NAME,
  icon: 'CreditCard',
  sortOrder: 16,
} as const;

// Default categories seeded at org creation.
// INVARIANT: Every row has orgId set — no global category rows.
// Icon names must exist in the web LucideIconPicker ICON_MAP.
const DEFAULT_CATEGORIES: { name: string; icon: string; sortOrder: number }[] =
  [
    { name: 'Bills', icon: 'Receipt', sortOrder: 0 },
    { name: 'Entertainment', icon: 'Tv', sortOrder: 1 },
    { name: 'Takeout', icon: 'Pizza', sortOrder: 2 },
    { name: 'Restaurants', icon: 'UtensilsCrossed', sortOrder: 3 },
    { name: 'Drinks & Treats', icon: 'Coffee', sortOrder: 4 },
    { name: 'Groceries', icon: 'ShoppingCart', sortOrder: 5 },
    { name: 'House', icon: 'Home', sortOrder: 6 },
    { name: 'Health & Wellbeing', icon: 'HeartPulse', sortOrder: 7 },
    { name: 'Shopping', icon: 'ShoppingBag', sortOrder: 8 },
    { name: 'Subscriptions', icon: 'Repeat', sortOrder: 9 },
    { name: 'Transport', icon: 'Bus', sortOrder: 10 },
    { name: 'Gas', icon: 'Fuel', sortOrder: 11 },
    { name: 'Travel', icon: 'Plane', sortOrder: 12 },
    { name: 'Gifts', icon: 'Gift', sortOrder: 13 },
    { name: 'Car Maintenance', icon: 'Wrench', sortOrder: 14 },
    { name: 'Other', icon: 'MoreHorizontal', sortOrder: 15 },
    BILL_PAYMENT_CATEGORY,
  ];

export const seedCategoryRowsForOrg = (orgId: string) =>
  DEFAULT_CATEGORIES.map((cat) => ({
    orgId,
    name: cat.name,
    icon: cat.icon,
    sortOrder: cat.sortOrder,
  }));

/** Insert default categories. `seedOrg` passes a transaction client. */
export const insertSeedCategoriesForOrg = async (
  executor: InsertExecutor,
  orgId: string
): Promise<void> => {
  await executor.insert(categories).values(seedCategoryRowsForOrg(orgId));
};

export const findBillPaymentCategoryId = async (
  executor: SelectExecutor,
  orgId: string
): Promise<string | null> => {
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
  return row?.id ?? null;
};

export const hasBillPaymentCategory = async (
  executor: SelectExecutor,
  orgId: string
): Promise<boolean> =>
  Boolean(await findBillPaymentCategoryId(executor, orgId));

/** Idempotent Bill Payment category for orgs seeded before import finalization. */
export const ensureBillPaymentCategoryForOrg = async (
  executor: InsertExecutor,
  orgId: string
): Promise<void> => {
  await executor
    .insert(categories)
    .values({
      orgId,
      name: BILL_PAYMENT_CATEGORY.name,
      icon: BILL_PAYMENT_CATEGORY.icon,
      sortOrder: BILL_PAYMENT_CATEGORY.sortOrder,
    })
    .onConflictDoNothing({
      target: [categories.orgId, categories.name],
    });
};

export const seedOrgCategories = async (orgId: string): Promise<void> => {
  await insertSeedCategoriesForOrg(db, orgId);
};

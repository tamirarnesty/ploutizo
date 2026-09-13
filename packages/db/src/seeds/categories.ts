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
} as const;

// Default categories seeded at org creation.
// INVARIANT: Every row has orgId set — no global category rows.
// Icon names must exist in the web LucideIconPicker ICON_MAP.
const DEFAULT_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Bills', icon: 'Receipt' },
  { name: 'Entertainment', icon: 'Tv' },
  { name: 'Takeout', icon: 'Pizza' },
  { name: 'Restaurants', icon: 'UtensilsCrossed' },
  { name: 'Drinks & Treats', icon: 'Coffee' },
  { name: 'Groceries', icon: 'ShoppingCart' },
  { name: 'House', icon: 'Home' },
  { name: 'Health & Wellbeing', icon: 'HeartPulse' },
  { name: 'Shopping', icon: 'ShoppingBag' },
  { name: 'Subscriptions', icon: 'Repeat' },
  { name: 'Transport', icon: 'Bus' },
  { name: 'Gas', icon: 'Fuel' },
  { name: 'Travel', icon: 'Plane' },
  { name: 'Gifts', icon: 'Gift' },
  { name: 'Car Maintenance', icon: 'Wrench' },
  { name: 'Other', icon: 'MoreHorizontal' },
  BILL_PAYMENT_CATEGORY,
];

const BILL_PAYMENT_SORT_ORDER = DEFAULT_CATEGORIES.findIndex(
  (category) => category.name === BILL_PAYMENT_CATEGORY.name
);

export const seedCategoryRowsForOrg = (orgId: string) =>
  DEFAULT_CATEGORIES.map((cat, sortOrder) => ({
    orgId,
    name: cat.name,
    icon: cat.icon,
    sortOrder,
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
      sortOrder: BILL_PAYMENT_SORT_ORDER,
    })
    .onConflictDoNothing({
      target: [categories.orgId, categories.name],
    });
};

export const seedOrgCategories = async (orgId: string): Promise<void> => {
  await insertSeedCategoriesForOrg(db, orgId);
};

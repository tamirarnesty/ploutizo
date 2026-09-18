import {
  BILL_PAYMENT_CATEGORY_NAME,
  HOUSEHOLD_DEFAULT_CATEGORIES,
} from '@ploutizo/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { categories } from '../schema/index';

type SelectExecutor = { select: typeof db.select };
type InsertExecutor = {
  insert: typeof db.insert;
};

// Icon names must resolve via the web Lucide catalog (PascalCase stored names).
const BILL_PAYMENT_SORT_ORDER = HOUSEHOLD_DEFAULT_CATEGORIES.findIndex(
  (category) => category.name === BILL_PAYMENT_CATEGORY_NAME
);
if (BILL_PAYMENT_SORT_ORDER === -1) {
  throw new Error('Bill Payment category missing from household defaults.');
}
const BILL_PAYMENT_CATEGORY =
  HOUSEHOLD_DEFAULT_CATEGORIES[BILL_PAYMENT_SORT_ORDER];

export const seedCategoryRowsForOrg = (orgId: string) =>
  HOUSEHOLD_DEFAULT_CATEGORIES.map((cat, sortOrder) => ({
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

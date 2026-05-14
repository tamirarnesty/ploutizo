import { count, eq, sql } from 'drizzle-orm'
import { db } from '../client'
import { categories } from '../schema'
import { insertSeedCategoriesForOrg } from './categories'
import { insertSeedMerchantRulesForOrg } from './merchantRules'

/**
 * Populate default categories and merchant rules for `orgId`.
 * Runs inside a DB transaction with `pg_advisory_xact_lock` so concurrent callers
 * (webhook + tenant guard, or parallel API requests) serialize per org and
 * re-check after locking — no duplicate inserts and no reliance on catching
 * unique-violation errors.
 */
export const seedOrg = async (orgId: string): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(abs(hashtext(${orgId}))::bigint)`
    )
    const [row] = await tx
      .select({ n: count() })
      .from(categories)
      .where(eq(categories.orgId, orgId))
    if (Number(row?.n ?? 0) > 0) return

    await insertSeedCategoriesForOrg(tx, orgId)
    await insertSeedMerchantRulesForOrg(tx, orgId)
  })
}

/**
 * Fast path when the org is already seeded (avoids opening a transaction).
 * `seedOrg` remains the single idempotent implementation under the advisory lock.
 */
export const ensureOrgSeeded = async (orgId: string): Promise<void> => {
  const [row] = await db
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.orgId, orgId))
  if (Number(row?.n ?? 0) > 0) return
  await seedOrg(orgId)
}

export {
  insertSeedCategoriesForOrg,
  seedOrgCategories,
} from './categories'
export {
  insertSeedMerchantRulesForOrg,
  seedOrgMerchantRules,
} from './merchantRules'

import { count, eq, sql } from 'drizzle-orm'
import { db } from '../client'
import { categories, merchantRules } from '../schema'
import { insertSeedCategoriesForOrg } from './categories'
import { insertSeedMerchantRulesForOrg } from './merchantRules'

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
 */
export const seedOrg = async (orgId: string): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(abs(hashtext(${orgId})::bigint))`
    )
    const [categoriesRow] = await tx
      .select({ n: count() })
      .from(categories)
      .where(eq(categories.orgId, orgId))
    const [rulesRow] = await tx
      .select({ n: count() })
      .from(merchantRules)
      .where(eq(merchantRules.orgId, orgId))

    if (Number(categoriesRow?.n ?? 0) === 0) {
      await insertSeedCategoriesForOrg(tx, orgId)
    }
    if (Number(rulesRow?.n ?? 0) === 0) {
      await insertSeedMerchantRulesForOrg(tx, orgId)
    }
  })
}

/**
 * Fast path when the org is already seeded (avoids opening a transaction).
 * `seedOrg` remains the single idempotent implementation under the advisory lock.
 * Checks both categories and merchant rules — if either is missing, runs full seed.
 */
export const ensureOrgSeeded = async (orgId: string): Promise<void> => {
  const [categoriesRow] = await db
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.orgId, orgId))
  const [rulesRow] = await db
    .select({ n: count() })
    .from(merchantRules)
    .where(eq(merchantRules.orgId, orgId))
  if (Number(categoriesRow?.n ?? 0) > 0 && Number(rulesRow?.n ?? 0) > 0) return
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

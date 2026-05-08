import { count, eq } from 'drizzle-orm'
import { db } from '../client'
import { categories } from '../schema'
import { seedOrgCategories } from './categories'
import { seedOrgMerchantRules } from './merchantRules'

// seedOrg: called at org creation to populate default tenant data.
// Both functions are called — do not call them individually unless testing.
export const seedOrg = async (orgId: string): Promise<void> => {
  await seedOrgCategories(orgId)
  await seedOrgMerchantRules(orgId)
}

/**
 * Idempotent guard when the Clerk organization.created webhook did not run
 * (common in local dev). Safe to call on every cold-start first request: skips
 * if categories already exist. Races between parallel first requests may throw
 * a unique constraint from seedOrg; those are ignored.
 */
export const ensureOrgSeeded = async (orgId: string): Promise<void> => {
  const [row] = await db
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.orgId, orgId))
  if (Number(row?.n ?? 0) > 0) return
  try {
    await seedOrg(orgId)
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: string }).code : undefined
    if (code !== '23505') throw e
  }
}

export { seedOrgCategories, seedOrgMerchantRules }

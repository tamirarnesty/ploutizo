import { db } from '../client'
import { merchantRules } from '../schema/index'

// Default merchant rules seeded at org creation.
// INVARIANT: Every row has orgId set — no global merchant rule rows.
// Schema uses `pattern` (not matchValue) and `renameTo` (not renameDescription).
const DEFAULT_MERCHANT_RULES: {
  name: string
  matchType: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex'
  pattern: string
  renameTo: string | null
  priority: number
}[] = [
  { name: 'Tim Hortons', matchType: 'contains', pattern: 'TIM HORTONS', renameTo: 'Tim Hortons', priority: 0 },
  { name: 'Starbucks', matchType: 'contains', pattern: 'STARBUCKS', renameTo: 'Starbucks', priority: 1 },
  { name: 'Amazon', matchType: 'contains', pattern: 'AMAZON', renameTo: 'Amazon', priority: 2 },
  { name: 'Netflix', matchType: 'exact', pattern: 'NETFLIX.COM', renameTo: 'Netflix', priority: 3 },
  { name: 'Spotify', matchType: 'exact', pattern: 'SPOTIFY', renameTo: 'Spotify', priority: 4 },
]

export const seedOrgMerchantRules = async (orgId: string): Promise<void> => {
  await db.insert(merchantRules).values(
    DEFAULT_MERCHANT_RULES.map((rule) => ({
      orgId, // non-nullable — always set to the passed orgId
      pattern: rule.pattern,
      matchType: rule.matchType,
      renameTo: rule.renameTo,
      priority: rule.priority,
    }))
  )
}

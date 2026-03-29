import { db } from '../client.js'
import { categories } from '../schema/index.js'

// Default categories seeded at org creation.
// INVARIANT: Every row has orgId set — no global category rows.
const DEFAULT_CATEGORIES: Array<{ name: string; icon: string; sortOrder: number }> = [
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
]

export const seedOrgCategories = async (orgId: string): Promise<void> => {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((cat) => ({
      orgId, // non-nullable — always set to the passed orgId
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    }))
  )
}

/**
 * packages/db/schema/budgets.ts
 *
 * Household-wide budget limits per category per period.
 */

import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { budgetPeriodTypeEnum } from "./enums"
import { orgs } from "./auth"
import { categories } from "./classification"

/** Unsigned integer cents. */
const cents = () => integer()

/**
 * budgets
 * One budget per category per period for the org.
 * Uniqueness of one active budget per category per period is enforced
 * in the application layer, not via DB constraint, to allow for historical
 * budget records across periods.
 *
 * rolloverAmount: surplus in cents carried forward from the previous period.
 * Populated by the application when a period closes and rollover = true.
 * Overspend never rolls over — only surplus.
 */
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Budget limit in unsigned integer cents. */
    amount: cents().notNull(),
    periodType: budgetPeriodTypeEnum("period_type").notNull().default("monthly"),
    /** Required when periodType = "custom". Null for standard periods. */
    periodStart: date("period_start"),
    /** Required when periodType = "custom". Null for standard periods. */
    periodEnd: date("period_end"),
    rollover: boolean("rollover").notNull().default(false),
    /**
     * Carried surplus from the previous period in unsigned integer cents.
     * Null until a period closes. Only surplus rolls over — not overspend.
     */
    rolloverAmount: cents(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("budgets_org_idx").on(t.orgId),
    index("budgets_org_category_idx").on(t.orgId, t.categoryId),
  ]
)

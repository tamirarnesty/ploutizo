/**
 * packages/db/schema/recurring.ts
 *
 * Recurring transaction templates.
 */

import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import {
  recurringFrequencyEnum,
  recurringStatusEnum,
  transactionTypeEnum,
} from "./enums"
import { orgs } from "./auth"
import { accounts } from "./accounts"
import { categories } from "./classification"

/** Unsigned integer cents. */
const cents = () => integer()

/**
 * recurring_templates
 * Defines the schedule for a recurring transaction.
 *
 * Instances are generated lazily on page load (fetch-based, not scheduled
 * background jobs in v1). lastGeneratedAt tracks the most recently generated
 * instance date, preventing duplicate generation across sessions.
 *
 * Generated instances are normal transactions — fully editable independently.
 * Editing an instance never affects the template or other instances.
 * Setting status = "stopped" prevents future generation; existing instances
 * are untouched.
 */
export const recurringTemplates = pgTable(
  "recurring_templates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    /** The transaction type that generated instances will have. */
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    description: text("description").notNull(),
    /** Template amount in unsigned integer cents. */
    amount: cents().notNull(),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    startDate: date("start_date").notNull(),
    /** If null, the template recurs indefinitely. */
    endDate: date("end_date"),
    /**
     * The date of the most recently generated instance.
     * Null if no instances have been generated yet.
     * Used to determine which upcoming dates still need generation.
     */
    lastGeneratedAt: date("last_generated_at"),
    status: recurringStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("recurring_templates_org_idx").on(t.orgId),
    index("recurring_templates_org_status_idx").on(t.orgId, t.status),
  ]
)

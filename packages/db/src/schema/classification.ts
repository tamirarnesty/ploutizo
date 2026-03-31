/**
 * packages/db/schema/classification.ts
 *
 * Categories, tags, and merchant rules.
 * All three are household-scoped and seeded at org creation via seed scripts.
 * org_id is non-nullable on all tables — no global seed rows exist in the DB.
 */

import { sql } from "drizzle-orm"
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { merchantMatchTypeEnum } from "./enums.js"
import { orgs, orgMembers } from "./auth.js"

/**
 * categories
 * Expense classification used by transactions, budgets, and merchant rules.
 * Seeded at org creation via seedOrgCategories(orgId) in packages/db/seeds/.
 *
 * icon: stores a Lucide icon name string (e.g. "ShoppingCart") or an emoji
 * character. Lucide icons are shown in the editing UI; emoji rendered as-is.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Lucide icon name (e.g. "ShoppingCart") or emoji character. */
    icon: text("icon"),
    /** Hex colour string (e.g. "#22c55e") for charts and progress bars. */
    colour: text("colour"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_org_name_idx").on(t.orgId, t.name),
    index("categories_org_idx").on(t.orgId),
  ]
)

/**
 * tags
 * Reusable household-scoped labels. More granular than categories.
 * Applied to any transaction type. No seed list — entirely user-defined.
 * Created inline when first typed (select-or-create flow).
 */
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    colour: text("colour"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tags_org_name_idx").on(t.orgId, t.name),
    index("tags_org_idx").on(t.orgId),
  ]
)

/**
 * merchant_rules
 * Auto-categorisation rules applied during CSV import and manual transaction
 * creation. Seeded at org creation via seedOrgMerchantRules(orgId).
 *
 * org_id is always non-null — no global seed rows in the DB.
 * Rules are evaluated in ascending priority order; first match wins.
 */
export const merchantRules = pgTable(
  "merchant_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(),
    matchType: merchantMatchTypeEnum("match_type").notNull(),
    /** If set, replaces the raw transaction description with this cleaned name. */
    renameTo: text("rename_to"),
    /** If set, auto-assigns this category to matched transactions. */
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** If set, auto-assigns this member to matched transactions. */
    assigneeId: uuid("assignee_id").references(() => orgMembers.id, {
      onDelete: "set null",
    }),
    /**
     * Evaluation order — lower number = higher priority.
     * Rules are evaluated ascending; first match wins.
     */
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("merchant_rules_org_idx").on(t.orgId),
    index("merchant_rules_org_priority_idx").on(t.orgId, t.priority),
  ]
)

/**
 * merchant_rule_tags
 * Tags to auto-apply when a merchant rule matches a transaction.
 */
export const merchantRuleTags = pgTable(
  "merchant_rule_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => merchantRules.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("merchant_rule_tags_rule_tag_idx").on(t.ruleId, t.tagId),
  ]
)

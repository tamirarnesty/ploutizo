/**
 * packages/db/schema/accounts.ts
 *
 * Financial accounts and their membership.
 */

import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { accountTypeEnum } from "./enums"
import { orgs, orgMembers } from "./auth"

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    institution: text("institution"),
    lastFour: text("last_four"),
    /** ISO 4217 currency code. Defaults to CAD. */
    currency: text("currency").notNull().default("CAD"),
    /**
     * When true, this account is excluded from inter-member settlement
     * calculations. Used for joint accounts where each person pays their
     * own share directly (e.g. a shared card with split billing).
     */
    excludeFromSettlement: boolean("exclude_from_settlement")
      .notNull()
      .default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("accounts_org_idx").on(t.orgId)]
)

/**
 * account_members
 * Which org members own a given account.
 * One member = personal account. Two or more = shared account.
 */
export const accountMembers = pgTable(
  "account_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => orgMembers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("account_members_account_member_idx").on(
      t.accountId,
      t.memberId
    ),
    index("account_members_member_idx").on(t.memberId),
  ]
)

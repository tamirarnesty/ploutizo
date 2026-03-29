/**
 * packages/db/schema/investments.ts
 *
 * Investment account metadata and contribution room settings.
 *
 * Investment accounts extend the base accounts table — every investment
 * account has both an accounts row (type = "investment") and an
 * investment_accounts row with type-specific metadata.
 *
 * Contribution room calculation by type:
 *   TFSA  — automatic: CRA annual limits × years since member turned 18,
 *            minus all tracked contributions. Requires member.birthYear.
 *   FHSA  — automatic: $8,000/year from opened_at, $40,000 lifetime cap,
 *            minus all tracked contributions.
 *   RRSP  — manual v1: user sets manualRoomOverride directly in
 *            contribution_room_settings. App tracks contributions against it.
 *   RESP / non-registered / other — no limit tracked.
 */

import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { investmentTypeEnum } from "./enums"
import { orgs, orgMembers } from "./auth"
import { accounts } from "./accounts"

/** Unsigned integer cents. */
const cents = () => integer()

/**
 * investment_accounts
 * Extends the accounts table with investment-specific metadata.
 * accountId references a row in accounts WHERE type = "investment".
 * The unique constraint on accountId enforces the one-to-one relationship.
 */
export const investmentAccounts = pgTable(
  "investment_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => orgMembers.id, { onDelete: "cascade" }),
    /**
     * The base accounts row for this investment account.
     * Unique — one investment_accounts row per accounts row.
     */
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" })
      .unique(),
    investmentType: investmentTypeEnum("investment_type").notNull(),
    /**
     * Date the account was opened.
     * Required for FHSA room calculation (room accrues from open date).
     */
    openedAt: date("opened_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("investment_accounts_org_idx").on(t.orgId),
    index("investment_accounts_member_idx").on(t.memberId),
  ]
)

/**
 * contribution_room_settings
 * Per-member, per-investment-account room configuration.
 *
 * manualRoomOverride: used for RRSP in v1 where the CRA limit is
 * income-derived and must be entered manually by the user.
 * Null for account types where room is calculated automatically (TFSA, FHSA).
 *
 * One row per investment account — enforced by unique on investmentAccountId.
 */
export const contributionRoomSettings = pgTable(
  "contribution_room_settings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    investmentAccountId: uuid("investment_account_id")
      .notNull()
      .references(() => investmentAccounts.id, { onDelete: "cascade" })
      .unique(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => orgMembers.id, { onDelete: "cascade" }),
    /**
     * Manual contribution room override in unsigned integer cents.
     * Used for RRSP v1 — user sets their available room directly.
     * Null for TFSA and FHSA (room is calculated automatically).
     */
    manualRoomOverride: cents(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("contribution_room_settings_member_idx").on(t.memberId)]
)

/**
 * packages/db/schema/auth.ts
 *
 * Identity and tenancy tables.
 * "orgs" is the multi-tenancy unit (user-facing term: "household").
 * All other tables reference orgs via org_id.
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

import { memberRoleEnum } from "./enums.js"

// ---------------------------------------------------------------------------
// Shared helpers (local to this file — imported from client.ts in real usage)
// ---------------------------------------------------------------------------

/** Unsigned integer cents. */
const cents = () => integer()

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * users
 * Mirrored from the auth provider (currently Clerk) on first sign-in via webhook.
 * externalId is the auth provider's user ID — intentionally provider-agnostic.
 * If the auth provider changes, this field remains semantically correct.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  /**
   * The auth provider's user ID (e.g. Clerk user ID "user_2abc...").
   * Named externalId rather than clerkId to remain auth-provider-agnostic.
   */
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * orgs
 * Org settings anchor. Clerk owns org identity (name, members, invitations) —
 * this table stores only app-specific org-level data.
 * `id` is the Clerk org ID (e.g. "org_2abc...") — not a generated UUID.
 *
 * settlementThreshold is the household-level override in cents.
 * Precedence: org_member.settlementThreshold > orgs.settlementThreshold > 5000 (global default)
 */
export const orgs = pgTable("orgs", {
  id: text("id").primaryKey(),
  settlementThreshold: cents(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * org_members
 * Join table between users and orgs.
 * birthYear is stored here (not on users) because it is private per org
 * context and used only for TFSA contribution room calculation.
 * settlementThreshold overrides the org-level threshold for this member.
 */
export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: text("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("admin"),
    displayName: text("display_name").notNull(),
    /** Private — used only for TFSA contribution room calculation. */
    birthYear: integer("birth_year"),
    /**
     * Per-member settlement reminder threshold in cents.
     * Null = fall through to org-level threshold.
     */
    settlementThreshold: cents(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("org_members_org_user_idx").on(t.orgId, t.userId),
    index("org_members_org_idx").on(t.orgId),
  ]
)


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

import { invitationStatusEnum, memberRoleEnum } from "./enums"

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
 * The tenancy unit. User-facing term is "household" but the schema uses
 * "orgs" for brevity and provider-agnosticism, consistent with org_id
 * conventions throughout.
 *
 * subdomain is immutable after creation — enforced in the application layer.
 * settlementThreshold is the household-level override in cents.
 * Precedence: org_member.settlementThreshold > orgs.settlementThreshold > 5000 (global default)
 */
export const orgs = pgTable(
  "orgs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    displayName: text("display_name").notNull(),
    subdomain: text("subdomain").notNull(),
    settlementThreshold: cents(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("orgs_subdomain_idx").on(t.subdomain)]
)

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
    orgId: uuid("org_id")
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

/**
 * invitations
 * Email-based invitation to join an org.
 * One pending invitation per email per org at a time — enforced by partial
 * unique index on (org_id, invitee_email) WHERE status = 'pending'.
 * Expires 7 days after creation — enforced in application layer.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => orgMembers.id),
    inviteeEmail: text("invitee_email").notNull(),
    token: text("token").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invitations_org_email_pending_idx")
      .on(t.orgId, t.inviteeEmail)
      .where(sql`status = 'pending'`),
    index("invitations_token_idx").on(t.token),
  ]
)

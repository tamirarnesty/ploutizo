/**
 * packages/db/schema/notifications.ts
 *
 * In-app notifications. Fetch-based in v1 — generated on page load,
 * not via scheduled background jobs.
 */

import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { notificationTypeEnum } from "./enums"
import { orgs, orgMembers } from "./auth"

/**
 * notifications
 * Targeted at a specific org member.
 *
 * refId is a polymorphic UUID pointing at the entity that triggered the
 * notification (e.g. a budget_id, investment_account_id, account_id).
 * The type field identifies which table refId belongs to — look up
 * the entity using the type as a routing key in application code.
 *
 * Notification types and their typical refId targets:
 *   budget_caution / budget_over    → budgets.id
 *   settlement_reminder             → accounts.id
 *   contribution_over               → investment_accounts.id
 *   contribution_room_refresh       → investment_accounts.id (or null)
 *   invitation_received             → invitations.id
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => orgMembers.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    /**
     * Polymorphic reference — the entity that triggered this notification.
     * Null for notifications not tied to a specific entity
     * (e.g. contribution_room_refresh).
     */
    refId: uuid("ref_id"),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_org_idx").on(t.orgId),
    index("notifications_member_read_idx").on(t.memberId, t.read),
  ]
)

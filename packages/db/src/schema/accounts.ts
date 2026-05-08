/**
 * packages/db/schema/accounts.ts
 *
 * Financial accounts and their membership.
 * Accounts are org-scoped — no account exists without an org.
 * accountMembers links accounts to org_members for ownership tracking.
 */

import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { accountTypeEnum } from './enums'
import { orgs, orgMembers } from './auth'

/**
 * accounts
 * A financial account belonging to an org (household).
 * Accounts can have multiple owners (via account_members).
 * statementDueDay (1–31, nullable) is used by GET /api/settlements to compute
 * the next upcoming due date and status badge for this account (D-12, D-13).
 */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    institution: text('institution'),
    lastFour: text('last_four'),
    /**
     * Day of the month (1–31) when a credit-card or similar account's statement is due.
     * Nullable — not all account types have a statement due date.
     * Used by GET /api/settlements to compute the next dueDate and status (D-12, D-13, D-14).
     */
    statementDueDay: integer('statement_due_day'),
    /** Soft-delete: set to archive the account without losing history. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('accounts_org_idx').on(t.orgId)]
)

/**
 * account_members
 * Links an account to one or more org members (account owners).
 * Unique constraint prevents duplicate ownership records.
 */
export const accountMembers = pgTable(
  'account_members',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => orgMembers.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('account_members_account_member_idx').on(t.accountId, t.memberId),
    index('account_members_account_idx').on(t.accountId),
    index('account_members_member_idx').on(t.memberId),
  ]
)

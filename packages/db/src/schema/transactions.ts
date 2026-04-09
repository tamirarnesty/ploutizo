/**
 * packages/db/schema/transactions.ts
 *
 * Core financial transaction tables.
 * Single flexible table with nullable type-specific columns (D-01).
 * Soft-delete via deleted_at — all active-data queries use partial index (D-04, D-16).
 */
import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { transactionTypeEnum, incomeTypeEnum, investmentTypeEnum } from './enums.js'
import { orgs, orgMembers } from './auth.js'
import { accounts } from './accounts.js'
import { categories, tags } from './classification.js'
import { importBatches } from './import-batches.js'

/**
 * transactions
 * Single table design for all 6 transaction types (D-01).
 * Type-specific columns are nullable — only the relevant subset is populated per type.
 * amount is unsigned cents (D-02). Direction is encoded in type, never in sign.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    type: transactionTypeEnum('type').notNull(),
    /** Unsigned integer cents (D-02). Direction is implied by type, never by sign. */
    amount: integer('amount').notNull(),
    /** ISO date string YYYY-MM-DD. Stored as Postgres date column for native comparisons. */
    date: date('date').notNull(),
    description: text('description'),
    merchant: text('merchant'),

    // --- expense / refund columns ---
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    /**
     * Self-referential FK for refund linkage. Optional — unlinked refunds are valid.
     * Uses lazy arrow function to break Drizzle's circular type reference (D-05).
     */
    refundOf: uuid('refund_of').references((): AnyPgColumn => transactions.id, {
      onDelete: 'set null',
    }),

    // --- income columns ---
    incomeType: incomeTypeEnum('income_type'),
    incomeSource: text('income_source'),

    // --- transfer columns ---
    toAccountId: uuid('to_account_id').references(() => accounts.id, { onDelete: 'restrict' }),

    // --- settlement columns ---
    /** Source account for CSV deduplication across paired household exports (§5 Settlement). */
    settledAccountId: uuid('settled_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
    }),

    // --- contribution columns ---
    investmentType: investmentTypeEnum('investment_type'),

    // --- import linkage (D-06, D-13) ---
    /** Nullable FK to import batch. NULL for manually-created transactions (D-06, D-13). */
    importBatchId: uuid('import_batch_id').references(() => importBatches.id, {
      onDelete: 'set null',
    }),
    /**
     * Reserved for recurring transaction generation logic (deferred to v2, D-07).
     * No FK — recurring templates table does not exist in v1.
     */
    recurringTemplateId: uuid('recurring_template_id'),

    // --- soft-delete (D-04) ---
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('transactions_org_account_idx').on(t.orgId, t.accountId), // D-14: balance/settlement queries
    index('transactions_org_date_idx').on(t.orgId, t.date), // D-15: date-range filters
    index('transactions_active_idx').on(t.deletedAt).where(sql`deleted_at IS NULL`), // D-16: partial index for all active-data queries
    index('transactions_org_idx').on(t.orgId),
  ]
)

/**
 * transaction_assignees
 * Splits a transaction across household members.
 * amount_cents is the authoritative split share (D-08) — computed via Largest Remainder Method at write time.
 * percentage is a DISPLAY CACHE ONLY (D-09) — never use in balance math, returns as string from Drizzle.
 */
export const transactionAssignees = pgTable(
  'transaction_assignees',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => orgMembers.id, { onDelete: 'cascade' }),
    /** Authoritative split share in cents (D-08). Use this in all balance computations. */
    amountCents: integer('amount_cents').notNull(),
    /**
     * DISPLAY CACHE ONLY — NEVER use in balance computations (D-09).
     * Drizzle returns numeric columns as string — arithmetic on this field will not compile.
     * Computed and stored at write time purely for UI display.
     */
    percentage: numeric('percentage', { precision: 6, scale: 3 }),
  },
  (t) => [
    uniqueIndex('transaction_assignees_tx_member_idx').on(t.transactionId, t.memberId), // D-10
    index('transaction_assignees_tx_idx').on(t.transactionId),
  ]
)

/**
 * transaction_tags
 * Join table linking transactions to household tags (D-11).
 * Composite primary key — no surrogate UUID needed for a simple join.
 */
export const transactionTags = pgTable(
  'transaction_tags',
  {
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })]
)

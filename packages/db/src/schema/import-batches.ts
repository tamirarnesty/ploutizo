/**
 * packages/db/schema/import-batches.ts
 *
 * CSV import batch records. One batch per CSV file upload.
 * Transactions imported from a batch carry a non-null import_batch_id.
 * Manually-created transactions have import_batch_id = NULL.
 */
import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { accounts } from './accounts'
import { orgs } from './auth'
import { importBatchStatusEnum, importRowStatusEnum, transactionTypeEnum } from './enums'

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => accounts.id, {
      onDelete: 'restrict',
    }),
    /** Bank identifier string (e.g. 'td', 'rbc', 'ploutizo') — normalizer sets this. */
    source: text('source').notNull(),
    status: importBatchStatusEnum('status').notNull().default('draft'),
    fileName: text('file_name'),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
    rowCount: integer('row_count').notNull(),
    validRowCount: integer('valid_row_count').notNull().default(0),
    invalidRowCount: integer('invalid_row_count').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    discardedAt: timestamp('discarded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('import_batches_org_idx').on(t.orgId),
    index('import_batches_org_status_idx').on(t.orgId, t.status),
    index('import_batches_org_account_idx').on(t.orgId, t.accountId),
    uniqueIndex('import_batches_one_active_draft_per_account_idx')
      .on(t.orgId, t.accountId)
      .where(sql`status = 'draft'`),
  ]
)

export const importBatchRows = pgTable(
  'import_batch_rows',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => importBatches.id, { onDelete: 'cascade' }),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    rowNumber: integer('row_number').notNull(),
    status: importRowStatusEnum('status').notNull(),
    invalidReason: text('invalid_reason'),
    rawData: jsonb('raw_data').$type<Record<string, string>>().notNull(),
    externalId: text('external_id'),
    sourceDate: text('source_date'),
    sourceAmount: text('source_amount'),
    sourceDescription: text('source_description'),
    sourceType: text('source_type'),
    parsedDate: date('parsed_date'),
    parsedAmount: integer('parsed_amount'),
    parsedType: transactionTypeEnum('parsed_type'),
    parsedDescription: text('parsed_description'),
    reviewDate: date('review_date'),
    reviewAmount: integer('review_amount'),
    reviewType: transactionTypeEnum('review_type'),
    reviewDescription: text('review_description'),
    reviewCategoryName: text('review_category_name'),
    reviewAssigneeHint: text('review_assignee_hint'),
    reviewRefundLinkHint: text('review_refund_link_hint'),
    reviewNotes: text('review_notes'),
    reviewTags: jsonb('review_tags').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('import_batch_rows_batch_idx').on(t.batchId),
    index('import_batch_rows_org_idx').on(t.orgId),
    uniqueIndex('import_batch_rows_batch_row_number_idx').on(t.batchId, t.rowNumber),
  ]
)

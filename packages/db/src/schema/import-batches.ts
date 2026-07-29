/**
 * packages/db/schema/import-batches.ts
 *
 * CSV import batch records. One batch per CSV file upload.
 * Transactions imported from a batch carry a non-null import_batch_id.
 * Manually-created transactions have import_batch_id = NULL.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { accounts } from './accounts';
import { orgs } from './auth';
import { categories } from './classification';
import {
  importBatchStatusEnum,
  importRowStatusEnum,
  transactionTypeEnum,
} from './enums';

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id'),
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('import_batches_org_idx').on(t.orgId),
    index('import_batches_org_status_idx').on(t.orgId, t.status),
    index('import_batches_org_account_idx').on(t.orgId, t.accountId),
    uniqueIndex('import_batches_id_org_id_idx').on(t.id, t.orgId),
    uniqueIndex('import_batches_one_active_draft_per_account_idx')
      .on(t.orgId, t.accountId)
      .where(sql`status = 'draft'`),
    foreignKey({
      columns: [t.accountId, t.orgId],
      foreignColumns: [accounts.id, accounts.orgId],
    }).onDelete('restrict'),
  ]
);

export const importBatchRows = pgTable(
  'import_batch_rows',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    batchId: uuid('batch_id').notNull(),
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
    reviewCategoryId: uuid('review_category_id'),
    reviewAssigneeMemberIds: jsonb('review_assignee_member_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    /**
     * Settlement funding account selected during review (paid-from).
     * Migration 0010 uses `ON DELETE SET NULL (review_counterpart_account_id)`
     * so the required org_id remains intact.
     */
    reviewCounterpartAccountId: uuid('review_counterpart_account_id'),
    /**
     * Reviewed refund link to an existing expense. Original CSV hint remains in
     * review_refund_link_hint / source provenance fields.
     *
     * Composite org FK lives only in
     * `0010_import_finalization_foundation.sql` as
     * `import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk`
     * — Drizzle cannot declare it here without a schema cycle
     * (transactions → import_batches → transactions). Keep that SQL
     * constraint in sync with this comment. It uses
     * `ON DELETE SET NULL (review_refund_of)` to preserve org_id.
     */
    reviewRefundOf: uuid('review_refund_of'),
    /**
     * Same-import expense row this refund links to. Mutually exclusive with
     * `reviewRefundOf` at the service boundary. Self-FK is same-table so it
     * is declared in SQL migration `0011_import_classification_refund_links.sql`.
     */
    reviewRefundOfBatchRowId: uuid('review_refund_of_batch_row_id'),
    reviewRefundLinkHint: text('review_refund_link_hint'),
    reviewNotes: text('review_notes'),
    reviewTagIds: jsonb('review_tag_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    selectedForImport: boolean('selected_for_import').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('import_batch_rows_org_idx').on(t.orgId),
    uniqueIndex('import_batch_rows_batch_row_number_idx').on(
      t.batchId,
      t.rowNumber
    ),
    uniqueIndex('import_batch_rows_id_org_id_idx').on(t.id, t.orgId),
    foreignKey({
      columns: [t.batchId, t.orgId],
      foreignColumns: [importBatches.id, importBatches.orgId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.reviewCategoryId, t.orgId],
      foreignColumns: [categories.id, categories.orgId],
    }),
    foreignKey({
      columns: [t.reviewCounterpartAccountId, t.orgId],
      foreignColumns: [accounts.id, accounts.orgId],
    }).onDelete('set null'),
  ]
);

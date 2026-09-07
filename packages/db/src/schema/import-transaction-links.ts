/**
 * packages/db/schema/import-transaction-links.ts
 *
 * Durable created/matched relationships from an import batch to transactions.
 * Matched links do not overwrite the transaction's original import provenance.
 */
import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { orgs } from './auth';
import { importBatchRows, importBatches } from './import-batches';
import { importTransactionLinkOutcomeEnum } from './enums';
import { transactions } from './transactions';

export const importTransactionLinks = pgTable(
  'import_transaction_links',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id').notNull(),
    batchRowId: uuid('batch_row_id').notNull(),
    transactionId: uuid('transaction_id').notNull(),
    outcome: importTransactionLinkOutcomeEnum('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('import_transaction_links_org_idx').on(t.orgId),
    index('import_transaction_links_org_batch_outcome_idx').on(
      t.orgId,
      t.batchId,
      t.outcome
    ),
    uniqueIndex('import_transaction_links_batch_row_idx').on(
      t.batchId,
      t.batchRowId
    ),
    uniqueIndex('import_transaction_links_id_org_id_idx').on(t.id, t.orgId),
    uniqueIndex('import_transaction_links_batch_transaction_idx').on(
      t.batchId,
      t.transactionId
    ),
    foreignKey({
      columns: [t.batchId, t.orgId],
      foreignColumns: [importBatches.id, importBatches.orgId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.batchRowId, t.orgId],
      foreignColumns: [importBatchRows.id, importBatchRows.orgId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.transactionId, t.orgId],
      foreignColumns: [transactions.id, transactions.orgId],
    }).onDelete('cascade'),
  ]
);

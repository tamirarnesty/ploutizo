/**
 * packages/db/schema/import-prepared-sets.ts
 *
 * Immutable, revision-bound prepared import sets and durable finalize outcomes.
 * Continue/prepare creates a new revision; Confirm (later) commits against one.
 */
import { sql } from 'drizzle-orm';
import {
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

import type { ImportPreparedReviewedValues } from '@ploutizo/types';

import { orgs } from './auth';
import { importBatchRows, importBatches } from './import-batches';
import { importPreparedOutcomeEnum } from './enums';
import { transactions } from './transactions';

export const importPreparedSets = pgTable(
  'import_prepared_sets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => importBatches.id, { onDelete: 'cascade' }),
    /** Monotonic revision per batch — prior revisions remain immutable. */
    revision: integer('revision').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('import_prepared_sets_org_idx').on(t.orgId),
    index('import_prepared_sets_batch_idx').on(t.batchId),
    uniqueIndex('import_prepared_sets_batch_revision_idx').on(
      t.batchId,
      t.revision
    ),
    uniqueIndex('import_prepared_sets_id_org_id_idx').on(t.id, t.orgId),
    foreignKey({
      columns: [t.batchId, t.orgId],
      foreignColumns: [importBatches.id, importBatches.orgId],
    }).onDelete('cascade'),
  ]
);

export const importPreparedOutcomes = pgTable(
  'import_prepared_outcomes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    preparedSetId: uuid('prepared_set_id')
      .notNull()
      .references(() => importPreparedSets.id, { onDelete: 'cascade' }),
    batchRowId: uuid('batch_row_id')
      .notNull()
      .references(() => importBatchRows.id, { onDelete: 'cascade' }),
    outcome: importPreparedOutcomeEnum('outcome').notNull(),
    /**
     * Created or matched transaction once Confirm records the outcome.
     * Null while the prepared set is only staged.
     */
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    reviewedValues: jsonb('reviewed_values')
      .$type<ImportPreparedReviewedValues>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('import_prepared_outcomes_org_idx').on(t.orgId),
    index('import_prepared_outcomes_prepared_set_idx').on(t.preparedSetId),
    uniqueIndex('import_prepared_outcomes_set_row_idx').on(
      t.preparedSetId,
      t.batchRowId
    ),
    foreignKey({
      columns: [t.preparedSetId, t.orgId],
      foreignColumns: [importPreparedSets.id, importPreparedSets.orgId],
    }).onDelete('cascade'),
    foreignKey({
      columns: [t.batchRowId, t.orgId],
      foreignColumns: [importBatchRows.id, importBatchRows.orgId],
    }).onDelete('cascade'),
  ]
);

/**
 * packages/db/schema/import-batches.ts
 *
 * CSV import batch records. One batch per CSV file upload.
 * Transactions imported from a batch carry a non-null import_batch_id.
 * Manually-created transactions have import_batch_id = NULL.
 */
import { sql } from 'drizzle-orm'
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { orgs } from './auth.js'

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    orgId: text('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    /** Bank identifier string (e.g. 'td', 'rbc', 'ploutizo') — normalizer sets this. */
    source: text('source').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
    rowCount: integer('row_count').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('import_batches_org_idx').on(t.orgId)]
)

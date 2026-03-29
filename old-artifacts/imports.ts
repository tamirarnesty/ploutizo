/**
 * packages/db/schema/imports.ts
 *
 * CSV import batch tracking.
 */

import { sql } from "drizzle-orm"
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { orgs } from "./auth"

/**
 * import_batches
 * One record per CSV upload session.
 *
 * Every transaction created via import has import_batch_id stamped on it,
 * enabling:
 *   1. Import history view (filename, date, row counts)
 *   2. Undo/rollback — soft-delete all transactions WHERE import_batch_id = X
 *   3. Cross-batch duplicate detection — check if external_id was already
 *      imported in a previous batch
 *
 * bankFormat records which internal normaliser parsed the file.
 * Values: "td" | "rbc" | "cibc" | "scotiabank" | "bmo" | "amex" |
 *         "tangerine" | "eq_bank" | "normalized"
 * Used for import history display and debugging misparse issues.
 */
export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    bankFormat: text("bank_format").notNull(),
    filename: text("filename").notNull(),
    rowCount: integer("row_count").notNull(),
    importedCount: integer("imported_count").notNull(),
    /** Earliest transaction date detected in the imported file. */
    dateFrom: date("date_from"),
    /** Latest transaction date detected in the imported file. */
    dateTo: date("date_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("import_batches_org_idx").on(t.orgId)]
)

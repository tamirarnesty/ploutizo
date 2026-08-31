/**
 * Global Financial institution catalog.
 * Seeded by migration; accounts reference rows by slug id.
 * Display names live in @ploutizo/types — this table exists for FK integrity only.
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

export const financialInstitutions = pgTable('financial_institutions', {
  id: text('id').primaryKey(),
});

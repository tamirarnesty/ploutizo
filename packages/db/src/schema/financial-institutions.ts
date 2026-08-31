/**
 * Global Financial institution catalog.
 * Seeded by migration; accounts reference rows by slug id.
 * Not org-scoped — households share the same fixed catalog.
 */

import { pgTable, text } from 'drizzle-orm/pg-core';

export const financialInstitutions = pgTable('financial_institutions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

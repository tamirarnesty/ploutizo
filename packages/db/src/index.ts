// @ploutizo/db — database client and schema
// IMPORTANT: This package is imported by apps/api ONLY — never by apps/web
export {
  closeDb,
  db,
  type Database,
  type DbClient,
  type Transaction,
} from './client';
export * from './schema/index';

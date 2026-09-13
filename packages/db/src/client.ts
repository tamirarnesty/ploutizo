import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index';
import { createNeonPool } from './neon-pool';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type {
  NeonDatabase,
  NeonTransaction,
} from 'drizzle-orm/neon-serverless';

// Note: Neon docs recommend TCP (postgres.js) for persistent servers; WebSocket is chosen
// in neon-pool for scale-to-zero benefit (phase 02.1.1 D-05).
const pool = createNeonPool(process.env.DATABASE_URL!);

export const db = drizzle({ client: pool, schema });

type Schema = typeof schema;

/** Process-wide Neon Drizzle client (`db`). */
export type Database = NeonDatabase<Schema>;

/**
 * Open Neon transaction (`tx` from `db.transaction`).
 * Extends the same query API as `Database`.
 */
export type Transaction = NeonTransaction<
  Schema,
  ExtractTablesWithRelations<Schema>
>;

/** Query executor: `db` or an open `Transaction`. */
export type DbClient = Database | Transaction;

/** Graceful shutdown — call after HTTP drain so in-flight queries can finish. */
export const closeDb = async (): Promise<void> => {
  await pool.end();
};

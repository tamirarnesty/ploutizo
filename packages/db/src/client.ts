import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema/index';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type {
  NeonDatabase,
  NeonTransaction,
} from 'drizzle-orm/neon-serverless';

// WebSocket mode: full transaction support + allows Neon compute to scale-to-zero.
// Node 22 provides native WebSocket globally — no 'ws' package needed.
// CRITICAL: neonConfig must be set BEFORE constructing the Pool.
// Note: Neon docs recommend TCP (postgres.js) for persistent servers; WebSocket is chosen
// here explicitly for scale-to-zero benefit (phase 02.1.1 D-05).
neonConfig.webSocketConstructor = globalThis.WebSocket;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

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

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
loadEnv({ path: join(repoRoot, '.env'), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  console.error('db:migrate failed: DATABASE_URL is not set');
  process.exit(1);
}

// Same WebSocket Pool as the API client. drizzle-kit migrate uses this driver
// too, but its spinner overwrites the failed query in Railway pre-deploy logs.
neonConfig.webSocketConstructor = globalThis.WebSocket;
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  '../drizzle'
);

const logMigrationError = (error: unknown): void => {
  console.error('Migration failed');
  console.error(error);
  if (error instanceof Error && error.cause !== undefined) {
    console.error('cause:', error.cause);
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'query' in error &&
    typeof error.query === 'string'
  ) {
    console.error('sql:', error.query);
  }
};

try {
  console.log(`Applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrations complete');
} catch (error) {
  logMigrationError(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

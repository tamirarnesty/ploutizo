import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

import { logMigrationError } from '../src/migration-log';
import { runMigrations } from '../src/run-migrations';

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

console.log(`Applying migrations from ${migrationsFolder}`);
const exitCode = await runMigrations({
  migrate,
  db,
  migrationsFolder,
  pool,
  logError: logMigrationError,
});

if (exitCode === 0) {
  console.log('Migrations complete');
} else {
  process.exit(exitCode);
}

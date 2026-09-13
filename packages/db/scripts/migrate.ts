import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

import { logMigrationError } from '@/migration-log';
import {
  migrationsFolder,
  migrationsSchema,
  migrationsTable,
} from '@/migrations-config';
import { createNeonPool } from '@/neon-pool';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
loadEnv({ path: join(repoRoot, '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  console.error('db:migrate failed: DATABASE_URL is not set');
  process.exit(1);
}

const pool = createNeonPool(databaseUrl);
const db = drizzle({ client: pool });

try {
  console.log(`Applying migrations from ${migrationsFolder}`);
  await migrate(db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });
  console.log('Migrations complete');
} catch (error) {
  logMigrationError(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

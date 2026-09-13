import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Keep in sync with `out` in repo-root `drizzle.config.ts`. */
export const migrationsFolder = join(packageRoot, 'drizzle');
export const migrationsSchema = 'drizzle';
export const migrationsTable = '__drizzle_migrations';

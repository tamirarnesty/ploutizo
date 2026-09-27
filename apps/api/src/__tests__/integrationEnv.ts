import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// Runs before each integration test file is imported, so `@ploutizo/db` sees DATABASE_URL.
loadEnv({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set in apps/api/.env for integration tests'
  );
}

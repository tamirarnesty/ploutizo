import type { migrate as drizzleMigrate } from 'drizzle-orm/neon-serverless/migrator';

import type { logMigrationError } from './migration-log';

export type MigrationPool = {
  end: () => Promise<void>;
};

export type MigrateFn = typeof drizzleMigrate;

export const runMigrations = async (deps: {
  migrate: MigrateFn;
  db: Parameters<MigrateFn>[0];
  migrationsFolder: string;
  pool: MigrationPool;
  logError: typeof logMigrationError;
}): Promise<number> => {
  try {
    await deps.migrate(deps.db, { migrationsFolder: deps.migrationsFolder });
    return 0;
  } catch (error) {
    deps.logError(error);
    return 1;
  } finally {
    await deps.pool.end();
  }
};

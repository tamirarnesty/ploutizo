import { describe, expect, it, vi } from 'vitest';

import { logMigrationError } from '../migration-log';
import { runMigrations } from '../run-migrations';
import type { MigrateFn } from '../run-migrations';

const testDb = {} as Parameters<MigrateFn>[0];

describe('runMigrations', () => {
  it('returns 0 and ends the pool when migrations succeed', async () => {
    const migrate = vi.fn(() => Promise.resolve()) as MigrateFn;
    const poolEnd = vi.fn(() => Promise.resolve());

    const exitCode = await runMigrations({
      migrate,
      db: testDb,
      migrationsFolder: '/tmp/drizzle',
      pool: { end: poolEnd },
      logError: logMigrationError,
    });

    expect(exitCode).toBe(0);
    expect(migrate).toHaveBeenCalledWith(testDb, {
      migrationsFolder: '/tmp/drizzle',
    });
    expect(poolEnd).toHaveBeenCalledOnce();
  });

  it('returns 1, logs the failure, and still ends the pool', async () => {
    const migrate = vi.fn(() =>
      Promise.reject(new Error('relation already exists'))
    ) as MigrateFn;
    const poolEnd = vi.fn(() => Promise.resolve());
    const logError = vi.fn();

    const exitCode = await runMigrations({
      migrate,
      db: testDb,
      migrationsFolder: '/tmp/drizzle',
      pool: { end: poolEnd },
      logError,
    });

    expect(exitCode).toBe(1);
    expect(logError).toHaveBeenCalledWith(new Error('relation already exists'));
    expect(poolEnd).toHaveBeenCalledOnce();
  });
});

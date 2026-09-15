import { describe, expect, it, vi } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm/errors';

import {
  logMigrationError,
  logMigrationStart,
  logMigrationSuccess,
} from '../migration-log';

const sql =
  'ALTER TABLE "import_prepared_outcomes" RENAME COLUMN "reviewed_values" TO "row_snapshot"';

describe('migration log', () => {
  it('logs start and success on stdout with a shared prefix', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logMigrationStart('/app/packages/db/drizzle');
    logMigrationSuccess();

    expect(logSpy.mock.calls).toEqual([
      ['db:migrate: starting'],
      ['db:migrate: applying /app/packages/db/drizzle'],
      ['db:migrate: succeeded'],
    ]);

    logSpy.mockRestore();
  });

  it('logs failed, sql, and postgres cause on stderr without dumping the error object', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new DrizzleQueryError(
      sql,
      [],
      new Error('column "reviewed_values" does not exist')
    );

    logMigrationError(error);

    expect(errorSpy.mock.calls).toEqual([
      ['db:migrate: failed'],
      [`db:migrate: sql: ${sql}`],
      ['db:migrate: cause: column "reviewed_values" does not exist'],
    ]);
    expect(errorSpy).not.toHaveBeenCalledWith(error);

    errorSpy.mockRestore();
  });

  it('logs generic errors as a cause line', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logMigrationError(new Error('connection refused'));

    expect(errorSpy.mock.calls).toEqual([
      ['db:migrate: failed'],
      ['db:migrate: cause: connection refused'],
    ]);

    errorSpy.mockRestore();
  });

  it('falls back to the query error message when the cause has no message', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new DrizzleQueryError(sql, [], new Error(''));

    logMigrationError(error);

    expect(errorSpy.mock.calls).toEqual([
      ['db:migrate: failed'],
      [`db:migrate: sql: ${sql}`],
      [`db:migrate: cause: ${error.message}`],
    ]);

    errorSpy.mockRestore();
  });
});

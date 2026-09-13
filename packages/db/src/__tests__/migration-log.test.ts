import { describe, expect, it, vi } from 'vitest';
import { DrizzleQueryError } from 'drizzle-orm/errors';

import { logMigrationError } from '../migration-log';

describe('logMigrationError', () => {
  it('logs DrizzleQueryError sql and nested cause', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logMigrationError(
      new DrizzleQueryError(
        'ALTER TABLE "import_prepared_outcomes" RENAME COLUMN "reviewed_values" TO "row_snapshot"',
        [],
        new Error('column "reviewed_values" does not exist')
      )
    );

    expect(errorSpy).toHaveBeenCalledWith('Migration failed');
    expect(errorSpy).toHaveBeenCalledWith(
      'sql:',
      'ALTER TABLE "import_prepared_outcomes" RENAME COLUMN "reviewed_values" TO "row_snapshot"'
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'cause:',
      new Error('column "reviewed_values" does not exist')
    );

    errorSpy.mockRestore();
  });

  it('logs generic errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logMigrationError(new Error('connection refused'));

    expect(errorSpy).toHaveBeenCalledWith('Migration failed');
    expect(errorSpy).toHaveBeenCalledWith(new Error('connection refused'));

    errorSpy.mockRestore();
  });
});

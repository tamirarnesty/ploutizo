import { DrizzleQueryError } from 'drizzle-orm/errors';

export const logMigrationError = (error: unknown): void => {
  console.error('');
  console.error('Migration failed');

  if (error instanceof DrizzleQueryError) {
    console.error('  sql:', error.query);
    if (error.params.length > 0) {
      console.error('  params:', error.params);
    }
    if (error.cause !== undefined) {
      console.error(
        '  cause:',
        error.cause instanceof Error ? error.cause.message : error.cause
      );
    }
    return;
  }

  if (error instanceof Error) {
    console.error('  error:', error.message);
    if (error.cause !== undefined) {
      console.error('  cause:', error.cause);
    }
    return;
  }

  console.error('  error:', String(error));
};

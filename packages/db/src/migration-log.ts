export const logMigrationError = (error: unknown): void => {
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

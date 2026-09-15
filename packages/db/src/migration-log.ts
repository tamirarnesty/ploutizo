const PREFIX = 'db:migrate:';

export const logMigrationStart = (migrationsFolder: string): void => {
  console.log(`${PREFIX} starting`);
  console.log(`${PREFIX} applying ${migrationsFolder}`);
};

export const logMigrationSuccess = (): void => {
  console.log(`${PREFIX} succeeded`);
};

const readQuery = (error: unknown): string | undefined => {
  if (
    error !== null &&
    typeof error === 'object' &&
    'query' in error &&
    typeof error.query === 'string' &&
    error.query.length > 0
  ) {
    return error.query;
  }
  return undefined;
};

const readCause = (error: unknown): unknown => {
  if (error !== null && typeof error === 'object' && 'cause' in error) {
    return error.cause;
  }
  return undefined;
};

const causeMessage = (cause: unknown): string | undefined => {
  if (typeof cause === 'string' && cause.length > 0) {
    return cause;
  }
  if (cause instanceof Error && cause.message.length > 0) {
    return cause.message;
  }
  if (cause === null || cause === undefined || typeof cause !== 'object') {
    return undefined;
  }
  if (
    'message' in cause &&
    typeof cause.message === 'string' &&
    cause.message.length > 0
  ) {
    return cause.message;
  }
  if ('error' in cause) {
    return causeMessage(cause.error);
  }
  return undefined;
};

export const logMigrationError = (error: unknown): void => {
  console.error(`${PREFIX} failed`);
  const sql = readQuery(error);
  if (sql !== undefined) {
    console.error(`${PREFIX} sql: ${sql}`);
  }
  const fromCause = causeMessage(readCause(error));
  if (fromCause !== undefined) {
    console.error(`${PREFIX} cause: ${fromCause}`);
    return;
  }
  if (error instanceof Error && error.message.length > 0) {
    console.error(`${PREFIX} cause: ${error.message}`);
    return;
  }
  console.error(`${PREFIX} cause: ${String(error)}`);
};

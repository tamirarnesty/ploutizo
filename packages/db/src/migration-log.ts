import { DrizzleQueryError } from 'drizzle-orm/errors';

const PREFIX = 'db:migrate:';

export const logMigrationStart = (migrationsFolder: string): void => {
  console.log(`${PREFIX} starting`);
  console.log(`${PREFIX} applying ${migrationsFolder}`);
};

export const logMigrationSuccess = (): void => {
  console.log(`${PREFIX} succeeded`);
};

const errorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value instanceof Error && value.message.length > 0) {
    return value.message;
  }
  return undefined;
};

export const logMigrationError = (error: unknown): void => {
  console.error(`${PREFIX} failed`);
  if (error instanceof DrizzleQueryError && error.query.length > 0) {
    console.error(`${PREFIX} sql: ${error.query}`);
  }
  const cause =
    errorMessage(error instanceof Error ? error.cause : undefined) ??
    errorMessage(error) ??
    String(error);
  console.error(`${PREFIX} cause: ${cause}`);
};

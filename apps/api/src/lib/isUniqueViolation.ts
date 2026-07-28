/** Detect Postgres unique_violation (23505), including nested Drizzle causes. */
export const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    if ('code' in current && (current as { code: string }).code === '23505') {
      return true;
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
};

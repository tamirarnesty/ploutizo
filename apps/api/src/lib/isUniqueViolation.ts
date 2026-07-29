/** Detect Postgres unique_violation (23505), including nested Drizzle causes. */
const walkErrorCauses = (
  error: unknown,
  visit: (node: Record<string, unknown>) => boolean
): boolean => {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    if (visit(current as Record<string, unknown>)) return true;
    current = 'cause' in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
};

export const isUniqueViolation = (error: unknown): boolean =>
  walkErrorCauses(error, (node) => node.code === '23505');

const EXTERNAL_ID_CONSTRAINT = 'transactions_active_account_external_id_idx';

/** True when a unique violation is specifically the active external-id index. */
export const isExternalIdUniqueViolation = (error: unknown): boolean =>
  walkErrorCauses(error, (node) => {
    if (node.code !== '23505') return false;
    const constraint = String(node.constraint ?? '');
    return constraint.includes(EXTERNAL_ID_CONSTRAINT);
  });

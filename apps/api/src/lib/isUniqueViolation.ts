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

const EXTERNAL_ID_CONSTRAINT = 'transactions_active_account_external_id_idx';

/** True when a unique violation is specifically the active external-id index. */
export const isExternalIdUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    if ('code' in current && (current as { code: string }).code === '23505') {
      const constraint =
        'constraint' in current
          ? String((current as { constraint: unknown }).constraint ?? '')
          : '';
      const detail =
        'detail' in current
          ? String((current as { detail: unknown }).detail ?? '')
          : '';
      const message =
        'message' in current
          ? String((current as { message: unknown }).message ?? '')
          : '';
      if (
        constraint.includes(EXTERNAL_ID_CONSTRAINT) ||
        detail.includes(EXTERNAL_ID_CONSTRAINT) ||
        message.includes(EXTERNAL_ID_CONSTRAINT) ||
        detail.includes('external_id') ||
        message.includes('external_id')
      ) {
        return true;
      }
    }
    current = 'cause' in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
};

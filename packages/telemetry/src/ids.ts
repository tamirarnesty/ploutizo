/**
 * Correlation identifiers for browser operations and API HTTP attempts.
 *
 * These IDs are telemetry-only. They must never be used for authorization,
 * tenancy, or access control.
 */

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Create a UUIDv4 correlation ID (operation or request). */
export const createCorrelationId = (): string => crypto.randomUUID();

/** True when value is a canonical UUIDv4 string (case-insensitive). */
export const isValidCorrelationId = (value: unknown): value is string =>
  typeof value === 'string' && UUID_V4_PATTERN.test(value);

/**
 * Parse a caller-supplied correlation ID.
 * Returns the trimmed UUIDv4 string, or null when invalid/missing.
 * Request middleware can use resolveCorrelationId() when it must replace invalid IDs.
 */
export const parseCorrelationId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return isValidCorrelationId(trimmed) ? trimmed : null;
};

/**
 * Accept a validated correlation ID or generate a fresh one.
 * Use for API request IDs that may arrive from trusted middleware seams only
 * as telemetry hints — never as authorization input.
 */
export const resolveCorrelationId = (
  value: unknown,
  create: () => string = createCorrelationId
): string => parseCorrelationId(value) ?? create();

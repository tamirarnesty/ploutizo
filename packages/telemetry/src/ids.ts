/**
 * Correlation identifiers for browser operations and API HTTP attempts.
 *
 * Operation IDs and request IDs are telemetry-only. They must never be used
 * for authorization, tenancy, or access control.
 */

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * HTTP header names used for telemetry correlation.
 * These are observability-only and must never influence authorization.
 */
export const TELEMETRY_CORRELATION_HEADERS = {
  /** API-owned per-HTTP-attempt request ID (returned to the browser). */
  requestId: 'X-Request-Id',
  /** Browser-owned logical operation ID (stable across Query retries). */
  operationId: 'X-Operation-Id',
  /** PostHog session correlation (telemetry only). */
  posthogSessionId: 'X-POSTHOG-SESSION-ID',
  /** PostHog distinct-id correlation (telemetry only). */
  posthogDistinctId: 'X-POSTHOG-DISTINCT-ID',
} as const;

export type TelemetryCorrelationHeader =
  (typeof TELEMETRY_CORRELATION_HEADERS)[keyof typeof TELEMETRY_CORRELATION_HEADERS];

const createUuidV4 = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for environments without crypto.randomUUID (should be rare on Node 22+).
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** Create a UUIDv4 operation ID for one logical browser/API capability. */
export const createOperationId = (): string => createUuidV4();

/** Create a UUIDv4 request ID for one API HTTP attempt. */
export const createRequestId = (): string => createUuidV4();

/** True when value is a canonical UUIDv4 string (case-insensitive). */
export const isValidCorrelationId = (value: unknown): value is string =>
  typeof value === 'string' && UUID_V4_PATTERN.test(value);

/**
 * Parse a caller-supplied correlation ID.
 * Returns the trimmed UUIDv4 string, or null when invalid/missing.
 * Invalid IDs must be replaced by a newly generated one — never trusted for auth.
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
  create: () => string = createRequestId
): string => parseCorrelationId(value) ?? create();

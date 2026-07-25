/**
 * Typed API error representation for safe telemetry classification.
 * Preserves user-facing messages while exposing only safe diagnostic fields.
 */

import type { ApiRequestCompleteAttributes, HttpMethod } from './attributes';

const HTTP_METHODS = new Set<string>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export type TelemetryErrorClassification = 'expected' | 'unexpected';

export type TelemetryApiErrorKind =
  | 'http'
  | 'network'
  | 'malformed'
  | 'unknown';

export interface TelemetryApiErrorInit {
  /** User-facing message (preserved for UI; not required for classification). */
  message: string;
  /** Safe HTTP status when known. */
  status?: number;
  /** Machine-readable error code from the API body when known. */
  code?: string;
  /** Normalized route template (e.g. `/api/transactions/:id`), never raw IDs. */
  route?: string;
  /** HTTP method when known (case-insensitive; stored uppercased). */
  method?: string;
  /** Request duration in milliseconds when measured. */
  durationMs?: number;
  /** Underlying cause (Error or unknown); not serialized into attributes as-is. */
  cause?: unknown;
  /** Telemetry-only request ID. */
  requestId?: string;
  /** Telemetry-only operation ID. */
  operationId?: string;
  /** How the failure was observed. */
  kind?: TelemetryApiErrorKind;
}

/** Known API codes that represent normal product/UI outcomes. */
export const EXPECTED_API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'DOMAIN_ERROR',
  'CONFLICT',
  'BAD_REQUEST',
] as const;

export type ExpectedApiErrorCode = (typeof EXPECTED_API_ERROR_CODES)[number];

const expectedCodeSet: ReadonlySet<string> = new Set(EXPECTED_API_ERROR_CODES);

/** HTTP statuses treated as expected product outcomes when paired with known codes/kinds. */
export const EXPECTED_HTTP_STATUSES = [400, 401, 403, 404, 409, 422] as const;

const expectedStatusSet: ReadonlySet<number> = new Set(EXPECTED_HTTP_STATUSES);

export class TelemetryApiError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly route: string | undefined;
  readonly method: HttpMethod | undefined;
  readonly durationMs: number | undefined;
  readonly requestId: string | undefined;
  readonly operationId: string | undefined;
  readonly kind: TelemetryApiErrorKind;
  override readonly cause: unknown;

  constructor(init: TelemetryApiErrorInit) {
    super(init.message);
    this.name = 'TelemetryApiError';
    this.status = init.status;
    this.code = init.code;
    this.route = init.route;
    const method = init.method?.toUpperCase();
    this.method =
      method !== undefined && HTTP_METHODS.has(method)
        ? (method as HttpMethod)
        : undefined;
    this.durationMs = init.durationMs;
    this.requestId = init.requestId;
    this.operationId = init.operationId;
    this.kind = init.kind ?? 'http';
    this.cause = init.cause;
  }
}

export interface ClassifyApiErrorInput {
  status?: number;
  code?: string;
  kind?: TelemetryApiErrorKind;
}

/**
 * Classify an API failure for Error Tracking escalation.
 * Expected outcomes stay diagnosable logs/UI states; unexpected ones are reportable.
 */
export const classifyApiError = (
  input: ClassifyApiErrorInput
): TelemetryErrorClassification => {
  const kind = input.kind ?? 'http';

  if (kind === 'network' || kind === 'malformed' || kind === 'unknown') {
    return 'unexpected';
  }

  if (typeof input.status === 'number' && input.status >= 500) {
    return 'unexpected';
  }

  if (typeof input.code === 'string' && input.code.length > 0) {
    if (expectedCodeSet.has(input.code)) {
      return 'expected';
    }
    // Unknown machine codes are actionable even on 4xx.
    return 'unexpected';
  }

  if (typeof input.status === 'number' && expectedStatusSet.has(input.status)) {
    return 'expected';
  }

  if (
    typeof input.status === 'number' &&
    input.status >= 400 &&
    input.status < 500
  ) {
    // 4xx without a known code — treat as unexpected so unknowns surface.
    return 'unexpected';
  }

  return 'unexpected';
};

export const isTelemetryApiError = (
  value: unknown
): value is TelemetryApiError => value instanceof TelemetryApiError;

/** Flat attributes suitable for `api.request.complete` (and similar) events. */
export type SafeApiErrorAttributes = Pick<
  ApiRequestCompleteAttributes,
  'kind' | 'classification' | 'status' | 'code' | 'route' | 'method'
>;

/**
 * Safe diagnostic fields for typed telemetry attributes.
 * Excludes user-facing message text, raw causes, and top-level event fields
 * (`durationMs`, correlation IDs) — attach those on the event itself.
 */
export const toSafeApiErrorAttributes = (
  error: TelemetryApiError
): SafeApiErrorAttributes => {
  const attributes: SafeApiErrorAttributes = {
    kind: error.kind,
    classification: classifyApiError({
      status: error.status,
      code: error.code,
      kind: error.kind,
    }),
  };

  if (typeof error.status === 'number') {
    attributes.status = error.status;
  }
  if (typeof error.code === 'string') {
    attributes.code = error.code;
  }
  if (typeof error.route === 'string') {
    attributes.route = error.route;
  }
  if (error.method !== undefined) {
    attributes.method = error.method;
  }

  return attributes;
};

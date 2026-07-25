import type { ApiRequestCompleteAttributes, HttpMethod } from './attributes';

export type ApiOutcomeKind = NonNullable<ApiRequestCompleteAttributes['kind']>;
export type ApiOutcomeClassification = NonNullable<
  ApiRequestCompleteAttributes['classification']
>;

export interface ClassifyApiOutcomeInput {
  status?: number;
  code?: string;
  kind?: ApiOutcomeKind;
  /**
   * Force unexpected/reportable even when status/code would otherwise be expected.
   * Use sparingly for product failures that look like client errors but need Error Tracking.
   */
  escalate?: boolean;
}

export interface ApiOutcomeClassificationResult {
  classification: ApiOutcomeClassification;
  /** True when Error Tracking / exception reporting should capture this outcome. */
  reportable: boolean;
}

/** Known expected API machine codes — logs/UI states, not Error Tracking issues. */
const EXPECTED_CODES = new Set([
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'NOT_FOUND',
  'TENANT_REQUIRED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'CONFLICT',
  'DOMAIN_ERROR',
  'INVALID_REGEX',
  'INVALID_EMAIL',
  'QUOTA_EXCEEDED',
  'IMPORT_FILE_EMPTY',
  'INVALID_SIGNATURE',
  'CONFIG_ERROR',
]);

/** Codes that always escalate even on non-5xx statuses. */
const UNEXPECTED_CODES = new Set(['INTERNAL_ERROR', 'UNKNOWN']);

const isClientHttpStatus = (status: number): boolean =>
  status >= 400 && status < 500;

/**
 * Classify an API failure for telemetry escalation.
 *
 * Expected: validation, not-found, authorization/tenant, known domain conflicts.
 * Unexpected/reportable: network, malformed, 5xx, unknown codes/kinds.
 *
 * When a machine `code` is present but not in the expected allowlist, the outcome
 * is reportable (unknown API codes). Status-only 4xx without a code remains expected.
 */
export const classifyApiOutcome = (
  input: ClassifyApiOutcomeInput
): ApiOutcomeClassificationResult => {
  if (input.escalate) {
    return { classification: 'unexpected', reportable: true };
  }

  const kind = input.kind ?? 'http';
  if (kind === 'network' || kind === 'malformed' || kind === 'unknown') {
    return { classification: 'unexpected', reportable: true };
  }

  const code = typeof input.code === 'string' ? input.code.trim() : undefined;
  if (code && UNEXPECTED_CODES.has(code)) {
    return { classification: 'unexpected', reportable: true };
  }

  const status =
    typeof input.status === 'number' && Number.isFinite(input.status)
      ? input.status
      : undefined;

  // Successful / redirect HTTP outcomes are never Error Tracking issues.
  if (status !== undefined && status >= 100 && status < 400) {
    return { classification: 'expected', reportable: false };
  }

  if (status !== undefined && status >= 500) {
    return { classification: 'unexpected', reportable: true };
  }

  if (code && EXPECTED_CODES.has(code)) {
    return { classification: 'expected', reportable: false };
  }

  // Present but unrecognized machine codes are actionable unknowns.
  if (code) {
    return { classification: 'unexpected', reportable: true };
  }

  // Status-only client errors (no machine code) stay expected UI/log states.
  if (status !== undefined && isClientHttpStatus(status)) {
    return { classification: 'expected', reportable: false };
  }

  // Missing/ambiguous http outcomes default to unexpected so they surface for triage.
  return { classification: 'unexpected', reportable: true };
};

export const isReportableApiOutcome = (
  input: ClassifyApiOutcomeInput
): boolean => classifyApiOutcome(input).reportable;

/**
 * Pick catalog-safe flat fields for `api.request.complete`.
 * Duration and correlation IDs stay on the event record, not in attributes.
 */
export const toApiRequestCompleteAttributes = (
  input: ApiRequestCompleteAttributes & {
    method?: HttpMethod;
  }
): ApiRequestCompleteAttributes => {
  const attributes: ApiRequestCompleteAttributes = {};

  if (typeof input.status === 'number' && Number.isFinite(input.status)) {
    attributes.status = input.status;
  }
  if (input.method !== undefined) {
    attributes.method = input.method;
  }
  if (typeof input.route === 'string') {
    attributes.route = input.route;
  }
  if (
    typeof input.retryCount === 'number' &&
    Number.isFinite(input.retryCount)
  ) {
    attributes.retryCount = input.retryCount;
  }
  if (typeof input.attempt === 'number' && Number.isFinite(input.attempt)) {
    attributes.attempt = input.attempt;
  }
  if (input.classification !== undefined) {
    attributes.classification = input.classification;
  }
  if (typeof input.code === 'string') {
    attributes.code = input.code;
  }
  if (input.kind !== undefined) {
    attributes.kind = input.kind;
  }
  if (typeof input.environment === 'string') {
    attributes.environment = input.environment;
  }
  if (typeof input.service === 'string') {
    attributes.service = input.service;
  }
  if (typeof input.release === 'string') {
    attributes.release = input.release;
  }
  if (typeof input.traceId === 'string') {
    attributes.traceId = input.traceId;
  }
  if (typeof input.spanId === 'string') {
    attributes.spanId = input.spanId;
  }

  return attributes;
};

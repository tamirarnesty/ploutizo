import type { ApiRequestCompleteAttributes } from './attributes';

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

/** Explicit system-failure codes — reportable even on 4xx (mis-wired handlers). */
const UNEXPECTED_CODES = new Set(['INTERNAL_ERROR', 'UNKNOWN']);

/**
 * Classify an API outcome for Error Tracking escalation.
 *
 * Reportable: 5xx, uncontrolled kinds, explicit escalate, INTERNAL_ERROR / UNKNOWN.
 * Expected: client and application outcomes (4xx), including any product machine code.
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

  if (status !== undefined && status >= 100 && status < 400) {
    return { classification: 'expected', reportable: false };
  }

  if (status !== undefined && status >= 500) {
    return { classification: 'unexpected', reportable: true };
  }

  if (status !== undefined && status >= 400 && status < 500) {
    return { classification: 'expected', reportable: false };
  }

  return { classification: 'unexpected', reportable: true };
};

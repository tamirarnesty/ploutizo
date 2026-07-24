import type { TelemetryOperation, TelemetrySurface } from './catalog';
import { assertTelemetryCatalogEntry } from './catalog';
import type { SanitizedAttributeValue } from './sanitize';
import { sanitizeAttributes } from './sanitize';
import { isValidCorrelationId } from './ids';

/**
 * Vendor-neutral telemetry contract shared by web and API callers.
 * Runtime adapters (web singleton vs API request-scoped) implement this
 * interface independently — this package does not provide a shared singleton.
 */

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type TelemetryOutcome = 'success' | 'failure' | 'cancelled';

export interface TelemetryEventInput {
  /** Stable catalog operation name (required). */
  operation: TelemetryOperation;
  /** Stable catalog surface (required). */
  surface: TelemetrySurface;
  /** Log severity; defaults to adapter-specific behavior (usually info). */
  level?: TelemetryLevel;
  /** Optional outcome for completion-style wide events. */
  outcome?: TelemetryOutcome;
  /**
   * Short diagnostic message. Prefer structured attributes.
   * Callers must not put user-entered or financial text here.
   */
  message?: string;
  /** Free-form attributes — accepted only after bounded recursive sanitization. */
  attributes?: Record<string, unknown>;
  /** Browser/logical operation ID (UUIDv4). Telemetry only — never for auth. */
  operationId?: string;
  /** API HTTP attempt request ID (UUIDv4). Telemetry only — never for auth. */
  requestId?: string;
  /** Duration in milliseconds when measured. */
  durationMs?: number;
}

export interface SafeTelemetryRecord {
  operation: TelemetryOperation;
  surface: TelemetrySurface;
  level: TelemetryLevel;
  outcome?: TelemetryOutcome;
  message?: string;
  attributes: Record<string, SanitizedAttributeValue>;
  redactedKeys: string[];
  truncated: boolean;
  operationId?: string;
  requestId?: string;
  durationMs?: number;
  recordedAt: string;
}

/**
 * Common caller contract. Adapters must never throw from record()/flush()
 * in a way that changes product behavior — failures degrade to no-op.
 */
export interface TelemetryClient {
  record(event: TelemetryEventInput): void;
  flush(): Promise<void>;
}

export interface PrepareTelemetryRecordOptions {
  /** When true, unknown catalog entries throw (default). Adapters may catch. */
  enforceCatalog?: boolean;
}

/**
 * Validate catalog membership, sanitize attributes, and normalize correlation IDs.
 * Returns a safe record ready for emission by any adapter.
 */
export const prepareTelemetryRecord = (
  event: TelemetryEventInput,
  options: PrepareTelemetryRecordOptions = {}
): SafeTelemetryRecord => {
  const enforceCatalog = options.enforceCatalog ?? true;
  if (enforceCatalog) {
    assertTelemetryCatalogEntry({
      operation: event.operation,
      surface: event.surface,
    });
  }

  const { attributes, redactedKeys, truncated } = sanitizeAttributes(
    event.attributes ?? {}
  );

  const operationId = isValidCorrelationId(event.operationId)
    ? event.operationId
    : undefined;
  const requestId = isValidCorrelationId(event.requestId)
    ? event.requestId
    : undefined;

  const message =
    typeof event.message === 'string' && event.message.length > 0
      ? event.message.slice(0, 200)
      : undefined;

  return {
    operation: event.operation,
    surface: event.surface,
    level: event.level ?? 'info',
    outcome: event.outcome,
    message,
    attributes,
    redactedKeys,
    truncated,
    operationId,
    requestId,
    durationMs:
      typeof event.durationMs === 'number' && Number.isFinite(event.durationMs)
        ? event.durationMs
        : undefined,
    recordedAt: new Date().toISOString(),
  };
};

import type { TelemetryOperation, TelemetrySurface } from './catalog';
import { assertTelemetryCatalogEntry } from './catalog';
import type { TelemetryAttributes } from './attributes';
import type { TelemetryAttributeValue } from './shape';
import { shapeAttributes, shapeMessage } from './shape';
import { parseCorrelationId } from './ids';

/**
 * Vendor-neutral telemetry contract shared by web and API callers.
 * Runtime adapters (web singleton vs API request-scoped) implement this
 * interface independently — this package does not provide a shared singleton.
 */

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type TelemetryOutcome = 'success' | 'failure' | 'cancelled';

export type TelemetryEventInput<
  O extends TelemetryOperation = TelemetryOperation,
> = {
  /** Stable catalog operation name (required). */
  operation: O;
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
  /** Operation-scoped attributes — compile-time typed per catalog entry. */
  attributes?: TelemetryAttributes<O>;
  /** Browser/logical operation ID (UUIDv4). Telemetry only — never for auth. */
  operationId?: string;
  /** API HTTP attempt request ID (UUIDv4). Telemetry only — never for auth. */
  requestId?: string;
  /** Duration in milliseconds when measured. */
  durationMs?: number;
};

export interface SafeTelemetryRecord {
  operation: TelemetryOperation;
  surface: TelemetrySurface;
  level: TelemetryLevel;
  outcome?: TelemetryOutcome;
  message?: string;
  attributes: Record<string, TelemetryAttributeValue>;
  droppedKeys: string[];
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

/**
 * Validate catalog membership, shape attributes, and normalize correlation IDs.
 * Returns a safe record ready for emission by any adapter.
 */
export const prepareTelemetryRecord = <O extends TelemetryOperation>(
  event: TelemetryEventInput<O>
): SafeTelemetryRecord => {
  assertTelemetryCatalogEntry({
    operation: event.operation,
    surface: event.surface,
  });

  const { attributes, droppedKeys, truncated } = shapeAttributes(
    event.attributes ?? {}
  );

  const operationId = parseCorrelationId(event.operationId) ?? undefined;
  const requestId = parseCorrelationId(event.requestId) ?? undefined;

  const message =
    typeof event.message === 'string' && event.message.length > 0
      ? shapeMessage(event.message)
      : undefined;

  return {
    operation: event.operation,
    surface: event.surface,
    level: event.level ?? 'info',
    outcome: event.outcome,
    message,
    attributes,
    droppedKeys,
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

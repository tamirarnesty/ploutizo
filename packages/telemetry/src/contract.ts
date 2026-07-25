import type { TelemetryOperation, TelemetrySurface } from './catalog';
import { assertTelemetryCatalogEntry } from './catalog';
import type { TelemetryAttributes } from './attributes';
import { parseCorrelationId } from './ids';

/**
 * Vendor-neutral telemetry contract shared by web and API callers.
 * Runtime adapters (web singleton vs API request-scoped) implement this
 * interface independently — this package does not provide a shared singleton.
 */

/** Flat attribute primitives only — nested objects/arrays are unsupported. */
export type TelemetryAttributeValue = string | number | boolean | null;

export type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error';
export type TelemetryOutcome = 'success' | 'failure' | 'cancelled';

const MAX_MESSAGE_LENGTH = 200;

/** Trim and bound a short diagnostic message. Empty → undefined. */
export const trimMessage = (
  message: string,
  maxLength = MAX_MESSAGE_LENGTH
): string | undefined => {
  const trimmed = message.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
};

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
  /**
   * Operation-scoped attributes — compile-time typed per catalog entry.
   * Flat primitives only (single-level keys → string | number | boolean | null).
   */
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
 * Validate catalog membership and normalize correlation IDs / messages.
 * Attributes are passed through as typed flat primitives from the caller.
 */
export const prepareTelemetryRecord = <O extends TelemetryOperation>(
  event: TelemetryEventInput<O>
): SafeTelemetryRecord => {
  assertTelemetryCatalogEntry({
    operation: event.operation,
    surface: event.surface,
  });

  const attributes = {
    ...(event.attributes ?? {}),
  } as Record<string, TelemetryAttributeValue>;

  const operationId = parseCorrelationId(event.operationId) ?? undefined;
  const requestId = parseCorrelationId(event.requestId) ?? undefined;

  const message =
    typeof event.message === 'string' && event.message.length > 0
      ? trimMessage(event.message)
      : undefined;

  return {
    operation: event.operation,
    surface: event.surface,
    level: event.level ?? 'info',
    outcome: event.outcome,
    message,
    attributes,
    operationId,
    requestId,
    durationMs:
      typeof event.durationMs === 'number' && Number.isFinite(event.durationMs)
        ? event.durationMs
        : undefined,
    recordedAt: new Date().toISOString(),
  };
};

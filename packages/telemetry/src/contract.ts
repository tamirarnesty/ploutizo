import { assertTelemetryCatalogEntry } from './catalog';
import { parseCorrelationId } from './ids';
import type {
  TelemetryOperation,
  TelemetrySurface,
  TelemetrySurfaceForOperation,
} from './catalog';
import type { TelemetryAttributes } from './attributes';

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
  TOperation extends TelemetryOperation = TelemetryOperation,
> = {
  /** Stable catalog operation name (required). */
  operation: TOperation;
  /** Stable catalog surface (required). */
  surface: TelemetrySurfaceForOperation<TOperation>;
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
  attributes?: TelemetryAttributes<TOperation>;
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
  record: <TOperation extends TelemetryOperation>(
    event: TelemetryEventInput<TOperation>
  ) => void;
  flush: () => Promise<void>;
}

/**
 * Validate catalog membership and normalize correlation IDs / messages.
 * Attributes are passed through as typed flat primitives from the caller.
 *
 * Throws {@link TelemetryCatalogError} on invalid operation/surface pairs.
 * Application code should use {@link TelemetryClient.record} via an adapter;
 * adapters must catch failures so telemetry never blocks product behavior.
 */
export const prepareTelemetryRecord = <TOperation extends TelemetryOperation>(
  event: TelemetryEventInput<TOperation>
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

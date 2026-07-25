import type {
  SafeTelemetryRecord,
  TelemetryClient,
  TelemetryEventInput,
  TelemetryLevel,
} from './contract';
import { prepareTelemetryRecord } from './contract';

/**
 * Vendor-neutral delivery target for a prepared telemetry record.
 * PostHog, console, OTel, and test fakes implement or compose this interface.
 */
export interface TelemetryRecordSink {
  emit: (record: SafeTelemetryRecord) => void;
}

/**
 * Level-scoped sink aligned with PostHog's structured browser logger and console.*.
 * Future web/API adapters map each level to their vendor's native log method.
 */
export interface TelemetryLevelSink {
  debug: (record: SafeTelemetryRecord) => void;
  info: (record: SafeTelemetryRecord) => void;
  warn: (record: SafeTelemetryRecord) => void;
  error: (record: SafeTelemetryRecord) => void;
}

/** Wire payload shared by console output, PostHog logger properties, and OTel attributes. */
export type TelemetryEmitPayload = SafeTelemetryRecord;

export const toEmitPayload = (
  record: SafeTelemetryRecord
): TelemetryEmitPayload => record;

/** Default log message when callers omit `message` — stable operation name for search. */
export const emitMessage = (record: SafeTelemetryRecord): string =>
  record.message ?? record.operation;

export const emitToLevelSink = (
  sink: TelemetryLevelSink,
  record: SafeTelemetryRecord
): void => {
  sink[record.level](record);
};

export const asRecordSink = (
  sink: TelemetryLevelSink
): TelemetryRecordSink => ({
  emit: (record) => emitToLevelSink(sink, record),
});

export const safeEmitRecord = (
  sink: TelemetryRecordSink,
  record: SafeTelemetryRecord
): void => {
  try {
    sink.emit(record);
  } catch {
    // Emission must never affect product behavior.
  }
};

export const composeRecordSinks = (
  ...sinks: TelemetryRecordSink[]
): TelemetryRecordSink => ({
  emit: (record) => {
    for (const sink of sinks) {
      safeEmitRecord(sink, record);
    }
  },
});

export interface SinkTelemetryClientOptions {
  /** Optional flush hook for buffered transports (PostHog, OTel exporters). */
  flush?: () => Promise<void>;
}

/**
 * Shared TelemetryClient factory — prepare record, then deliver via sink.
 * Console, PostHog, and composite local adapters use this entry point.
 */
export const createSinkTelemetryClient = (
  sink: TelemetryRecordSink,
  options: SinkTelemetryClientOptions = {}
): TelemetryClient => ({
  record: (event: TelemetryEventInput) => {
    try {
      const record = prepareTelemetryRecord(event);
      safeEmitRecord(sink, record);
    } catch {
      // Catalog/shape failures degrade to no-op.
    }
  },
  flush: async () => {
    try {
      await options.flush?.();
    } catch {
      // Flush must never affect product behavior.
    }
  },
});

export type TelemetryLevelHandler = (record: SafeTelemetryRecord) => void;

/** Build a level sink from per-level handlers — used by console and PostHog adapters. */
export const createLevelSink = (
  handlers: Record<TelemetryLevel, TelemetryLevelHandler>
): TelemetryLevelSink => ({
  debug: (record) => handlers.debug(record),
  info: (record) => handlers.info(record),
  warn: (record) => handlers.warn(record),
  error: (record) => handlers.error(record),
});

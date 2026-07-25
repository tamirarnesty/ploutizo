import type {
  SafeTelemetryRecord,
  TelemetryClient,
  TelemetryEventInput,
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
 * Adapters supply the four handlers directly.
 */
export interface TelemetryLevelSink {
  debug: (record: SafeTelemetryRecord) => void;
  info: (record: SafeTelemetryRecord) => void;
  warn: (record: SafeTelemetryRecord) => void;
  error: (record: SafeTelemetryRecord) => void;
}

/** Default log message when callers omit `message` — stable operation name for search. */
export const emitMessage = (record: SafeTelemetryRecord): string =>
  record.message ?? record.operation;

export const asRecordSink = (
  sink: TelemetryLevelSink
): TelemetryRecordSink => ({
  emit: (record) => {
    sink[record.level](record);
  },
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
      // Catalog validation failures degrade to no-op.
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

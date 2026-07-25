import { prepareTelemetryRecord } from '../contract';
import type { TelemetryClient, TelemetryEventInput } from '../contract';

export type ConsoleTelemetrySink = Pick<
  Console,
  'debug' | 'info' | 'warn' | 'error' | 'log'
>;

export interface ConsoleTelemetryClientOptions {
  /**
   * Console-like sink. Defaults to global console.
   * Inject a throwing sink in tests to prove non-blocking behavior.
   */
  sink?: ConsoleTelemetrySink;
  /** Prefix for structured local output. */
  prefix?: string;
}

export const createConsoleTelemetryClient = (
  options: ConsoleTelemetryClientOptions = {}
): TelemetryClient => {
  const prefix = options.prefix ?? '[telemetry]';
  const sink = options.sink ?? console;

  const record = (event: TelemetryEventInput) => {
    try {
      const telemetryRecord = prepareTelemetryRecord(event);
      sink[telemetryRecord.level].call(
        sink,
        prefix,
        telemetryRecord.message ?? telemetryRecord.operation,
        telemetryRecord
      );
    } catch {
      // Telemetry must never affect product behavior.
    }
  };

  return {
    record,
    flush: async () => {},
  };
};

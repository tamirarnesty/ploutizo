import type { TelemetryClient, TelemetryEventInput } from '../contract';
import { prepareTelemetryRecord } from '../contract';

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

/**
 * Local development adapter: emits structured JSON to the console.
 * Initialization and emission failures never throw to callers.
 */
export const createConsoleTelemetryClient = (
  options: ConsoleTelemetryClientOptions = {}
): TelemetryClient => {
  const prefix = options.prefix ?? '[telemetry]';
  let sink: ConsoleTelemetrySink | null = options.sink ?? console;

  const safeEmit = (level: TelemetryEventInput['level'], payload: unknown) => {
    if (!sink) {
      return;
    }
    try {
      const method =
        level === 'debug'
          ? sink.debug.bind(sink)
          : level === 'warn'
            ? sink.warn.bind(sink)
            : level === 'error'
              ? sink.error.bind(sink)
              : sink.info.bind(sink);
      method(prefix, payload);
    } catch {
      // Emission must never affect product behavior.
    }
  };

  return {
    record: (event) => {
      try {
        const record = prepareTelemetryRecord(event);
        safeEmit(record.level, record);
      } catch {
        // Catalog/sanitize/sink failures degrade to no-op.
      }
    },
    flush: async () => {
      // Console has nothing to flush; keep the promise API for adapter parity.
    },
  };
};

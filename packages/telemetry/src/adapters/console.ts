import type { TelemetryClient } from '../contract';
import {
  asRecordSink,
  createLevelSink,
  createSinkTelemetryClient,
  emitMessage,
  type TelemetryLevelSink,
} from '../emit';

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

export const createConsoleLevelSink = (
  options: ConsoleTelemetryClientOptions = {}
): TelemetryLevelSink => {
  const prefix = options.prefix ?? '[telemetry]';
  const sink = options.sink ?? console;

  const write = (
    method: keyof ConsoleTelemetrySink,
    message: string,
    payload: unknown
  ) => {
    sink[method].call(sink, prefix, message, payload);
  };

  return createLevelSink({
    debug: (record) => write('debug', emitMessage(record), record),
    info: (record) => write('info', emitMessage(record), record),
    warn: (record) => write('warn', emitMessage(record), record),
    error: (record) => write('error', emitMessage(record), record),
  });
};

/**
 * Local development adapter: emits structured records to the console.
 * Uses the shared level-sink path that PostHog web adapter will mirror.
 */
export const createConsoleTelemetryClient = (
  options: ConsoleTelemetryClientOptions = {}
): TelemetryClient =>
  createSinkTelemetryClient(asRecordSink(createConsoleLevelSink(options)));

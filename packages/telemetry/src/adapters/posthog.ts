/**
 * PostHog web adapter surface — implemented in apps/web once posthog-js is wired.
 * Keeps @ploutizo/telemetry vendor-free while matching PostHog structured logger APIs.
 */
import type { SafeTelemetryRecord, TelemetryClient } from '../contract';
import {
  createConsoleLevelSink,
  type ConsoleTelemetryClientOptions,
} from './console';
import {
  asRecordSink,
  composeRecordSinks,
  createSinkTelemetryClient,
  emitMessage,
  type TelemetryLevelSink,
} from '../emit';

export interface PostHogLogger {
  debug: (message: string, properties?: SafeTelemetryRecord) => void;
  info: (message: string, properties?: SafeTelemetryRecord) => void;
  warn: (message: string, properties?: SafeTelemetryRecord) => void;
  error: (message: string, properties?: SafeTelemetryRecord) => void;
}

/** Minimal posthog-js surface required by the web telemetry adapter. */
export interface PostHogTelemetryBridge {
  logger: PostHogLogger;
  capture: (event: string, properties?: SafeTelemetryRecord) => void;
  flush?: () => Promise<void>;
}

export interface PostHogTelemetryClientOptions {
  /**
   * When true (default), wide completion-style records also call capture()
   * with the stable catalog operation as the event name.
   */
  captureWideEvents?: boolean;
}

export const createPostHogLevelSink = (
  bridge: PostHogTelemetryBridge,
  options: PostHogTelemetryClientOptions = {}
): TelemetryLevelSink => {
  const captureWideEvents = options.captureWideEvents ?? true;

  const maybeCaptureWideEvent = (record: SafeTelemetryRecord) => {
    if (!captureWideEvents || record.outcome === undefined) {
      return;
    }
    bridge.capture(record.operation, record);
  };

  return {
    debug: (record) => {
      bridge.logger.debug(emitMessage(record), record);
    },
    info: (record) => {
      bridge.logger.info(emitMessage(record), record);
      maybeCaptureWideEvent(record);
    },
    warn: (record) => {
      bridge.logger.warn(emitMessage(record), record);
      maybeCaptureWideEvent(record);
    },
    error: (record) => {
      bridge.logger.error(emitMessage(record), record);
      maybeCaptureWideEvent(record);
    },
  };
};

/**
 * Web PostHog adapter — inject the initialized posthog-js client from apps/web.
 * Local dev can compose with console via composeRecordSinks().
 */
export const createPostHogTelemetryClient = (
  bridge: PostHogTelemetryBridge,
  options: PostHogTelemetryClientOptions = {}
): TelemetryClient =>
  createSinkTelemetryClient(
    asRecordSink(createPostHogLevelSink(bridge, options)),
    {
      flush: () => bridge.flush?.() ?? Promise.resolve(),
    }
  );

/** Local dev: structured console output plus PostHog development project (ADR 0006). */
export const createLocalTelemetryClient = (
  bridge: PostHogTelemetryBridge,
  consoleOptions: ConsoleTelemetryClientOptions = {}
): TelemetryClient =>
  createSinkTelemetryClient(
    composeRecordSinks(
      asRecordSink(createConsoleLevelSink(consoleOptions)),
      asRecordSink(createPostHogLevelSink(bridge))
    ),
    { flush: () => bridge.flush?.() ?? Promise.resolve() }
  );

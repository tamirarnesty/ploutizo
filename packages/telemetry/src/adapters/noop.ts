import type { TelemetryClient } from '../contract';

/**
 * No-op adapter used when telemetry is unavailable or intentionally disabled.
 * All methods preserve caller flow and never throw.
 */
export const createNoopTelemetryClient = (): TelemetryClient => ({
  record: () => {
    // Intentionally empty — unavailable adapters must not change product behavior.
  },
  flush: async () => {
    // Intentionally empty.
  },
});

import { prepareTelemetryRecord } from '../contract';
import type { SafeTelemetryRecord, TelemetryClient } from '../contract';

export interface FakeTelemetryClient extends TelemetryClient {
  /** Records successfully prepared for emission (in order). */
  readonly records: readonly SafeTelemetryRecord[];
  /** Clear captured state between tests. */
  reset: () => void;
  /**
   * When set, the next `record` call throws inside the adapter emit path
   * (after prepare) to prove callers remain non-blocking.
   */
  failNextEmit: (error?: unknown) => void;
}

/**
 * Test fake implementing the shared telemetry contract.
 * Caller tests assert on emitted safe records without vendor SDKs.
 */
export const createFakeTelemetryClient = (): FakeTelemetryClient => {
  const records: SafeTelemetryRecord[] = [];
  let pendingEmitError: unknown | undefined;

  const record: TelemetryClient['record'] = (event) => {
    try {
      const telemetryRecord = prepareTelemetryRecord(event);
      if (pendingEmitError !== undefined) {
        const error = pendingEmitError;
        pendingEmitError = undefined;
        throw error;
      }
      records.push(telemetryRecord);
    } catch {
      // Telemetry must never affect product behavior.
    }
  };

  return {
    record,
    flush: async () => {},
    get records() {
      return records;
    },
    reset: () => {
      records.length = 0;
      pendingEmitError = undefined;
    },
    failNextEmit: (error = new Error('fake telemetry emit failure')) => {
      pendingEmitError = error;
    },
  };
};

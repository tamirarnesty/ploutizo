import type { SafeTelemetryRecord, TelemetryClient } from '../contract';
import { createSinkTelemetryClient } from '../emit';

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

  const client = createSinkTelemetryClient({
    emit: (record) => {
      if (pendingEmitError !== undefined) {
        const error = pendingEmitError;
        pendingEmitError = undefined;
        throw error;
      }
      records.push(record);
    },
  });

  return {
    record: client.record,
    flush: client.flush,
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

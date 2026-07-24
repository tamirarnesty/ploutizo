import type {
  SafeTelemetryRecord,
  TelemetryClient,
  TelemetryEventInput,
} from '../contract';
import { prepareTelemetryRecord } from '../contract';

export interface FakeTelemetryClient extends TelemetryClient {
  /** Records successfully prepared for emission (in order). */
  readonly records: readonly SafeTelemetryRecord[];
  /** Raw inputs that failed prepare/emit (catalog errors, injected failures). */
  readonly failures: readonly { event: TelemetryEventInput; error: unknown }[];
  /** Clear captured state between tests. */
  reset: () => void;
  /**
   * When set, the next `record` call throws inside the adapter emit path
   * (after prepare) to prove callers remain non-blocking.
   */
  failNextEmit: (error?: unknown) => void;
}

export interface FakeTelemetryClientOptions {
  /** When true (default), invalid catalog entries are captured as failures. */
  captureFailures?: boolean;
}

/**
 * Test fake implementing the shared telemetry contract.
 * Caller tests assert on emitted safe records without vendor SDKs.
 */
export const createFakeTelemetryClient = (
  options: FakeTelemetryClientOptions = {}
): FakeTelemetryClient => {
  const captureFailures = options.captureFailures ?? true;
  const records: SafeTelemetryRecord[] = [];
  const failures: { event: TelemetryEventInput; error: unknown }[] = [];
  let pendingEmitError: unknown | undefined;

  const client: FakeTelemetryClient = {
    get records() {
      return records;
    },
    get failures() {
      return failures;
    },
    reset: () => {
      records.length = 0;
      failures.length = 0;
      pendingEmitError = undefined;
    },
    failNextEmit: (error = new Error('fake telemetry emit failure')) => {
      pendingEmitError = error;
    },
    record: (event) => {
      try {
        const record = prepareTelemetryRecord(event);
        if (pendingEmitError !== undefined) {
          const error = pendingEmitError;
          pendingEmitError = undefined;
          throw error;
        }
        records.push(record);
      } catch (error) {
        if (captureFailures) {
          failures.push({ event, error });
        }
        // Never rethrow — mirrors production adapter non-blocking contract.
      }
    },
    flush: async () => {
      // No buffered transport in the fake.
    },
  };

  return client;
};

import { prepareTelemetryRecord } from '@ploutizo/telemetry';
import type {
  TelemetryClient,
  TelemetryEventInput,
  TelemetryLevel,
} from '@ploutizo/telemetry';
import { toPostHogLogAttributes } from './recordAttributes';
import type { PostHog } from 'posthog-js';
import type { WebTelemetryEnv } from './env';

export interface CreatePostHogTelemetryClientOptions {
  env: WebTelemetryEnv;
  posthog: PostHog;
}

const levelToLoggerMethod = (
  level: TelemetryLevel
): 'debug' | 'info' | 'warn' | 'error' => {
  switch (level) {
    case 'debug':
      return 'debug';
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
};

/**
 * Maps prepared telemetry records to PostHog's structured logger.
 */
export const createPostHogTelemetryClient = (
  options: CreatePostHogTelemetryClientOptions
): TelemetryClient => {
  const { env, posthog } = options;

  const record = (event: TelemetryEventInput) => {
    try {
      if (!posthog.is_capturing()) {
        return;
      }

      const telemetryRecord = prepareTelemetryRecord(event);
      const attributes = toPostHogLogAttributes(telemetryRecord, env);
      const body = telemetryRecord.message ?? telemetryRecord.operation;
      const method = levelToLoggerMethod(telemetryRecord.level);

      posthog.logger[method](body, attributes);
    } catch {
      // Telemetry must never affect product behavior.
    }
  };

  return {
    record,
    flush: async () => {
      // PostHog web SDK batches logs internally; no explicit flush API.
    },
  };
};

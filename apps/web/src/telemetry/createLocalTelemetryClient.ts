import {
  createConsoleTelemetryClient,
  createNoopTelemetryClient,
} from '@ploutizo/telemetry';
import type { TelemetryClient, TelemetryEventInput } from '@ploutizo/telemetry';
import { createPostHogTelemetryClient } from './createPostHogTelemetryClient';
import type { PostHog } from 'posthog-js';
import type { WebTelemetryEnv } from './env';

export interface CreateLocalTelemetryClientOptions {
  env: WebTelemetryEnv;
  posthog?: PostHog | null;
  consoleClient?: TelemetryClient;
}

/**
 * Local development sink: structured console output plus PostHog when configured.
 */
export const createLocalTelemetryClient = (
  options: CreateLocalTelemetryClientOptions
): TelemetryClient => {
  const consoleClient =
    options.consoleClient ??
    (options.env.mirrorConsole
      ? createConsoleTelemetryClient({ prefix: '[web-telemetry]' })
      : undefined);

  const posthogClient =
    options.env.exportEnabled && options.posthog
      ? createPostHogTelemetryClient({
          env: options.env,
          posthog: options.posthog,
        })
      : undefined;

  if (!consoleClient && !posthogClient) {
    return createNoopTelemetryClient();
  }

  const record = (event: TelemetryEventInput) => {
    try {
      consoleClient?.record(event);
    } catch {
      // Telemetry must never affect product behavior.
    }

    try {
      posthogClient?.record(event);
    } catch {
      // Telemetry must never affect product behavior.
    }
  };

  return {
    record,
    flush: async () => {
      try {
        await Promise.all([
          consoleClient?.flush() ?? Promise.resolve(),
          posthogClient?.flush() ?? Promise.resolve(),
        ]);
      } catch {
        // ignore
      }
    },
  };
};

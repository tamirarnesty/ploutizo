import { createNoopTelemetryClient } from '@ploutizo/telemetry';
import type { TelemetryClient } from '@ploutizo/telemetry';
import { createLocalTelemetryClient } from './createLocalTelemetryClient';
import { createPostHogTelemetryClient } from './createPostHogTelemetryClient';
import type { PostHog } from 'posthog-js';
import type { WebTelemetryEnv } from './env';

export interface CreateWebTelemetryClientOptions {
  env: WebTelemetryEnv;
  posthog?: PostHog | null;
}

/**
 * Browser telemetry adapter entry point. Local mirrors to console; all
 * configured environments export through PostHog's structured logger.
 */
export const createWebTelemetryClient = (
  options: CreateWebTelemetryClientOptions
): TelemetryClient => {
  const { env, posthog } = options;

  if (env.mirrorConsole) {
    return createLocalTelemetryClient({ env, posthog });
  }

  if (env.exportEnabled && posthog) {
    return createPostHogTelemetryClient({ env, posthog });
  }

  return createNoopTelemetryClient();
};

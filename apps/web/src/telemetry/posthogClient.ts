import posthog from 'posthog-js';
import { buildPostHogInitOptions } from './privacy';
import type { PostHog } from 'posthog-js';
import type { WebTelemetryEnv } from './env';

let initialized = false;

export const initPostHog = (env: WebTelemetryEnv): PostHog | null => {
  if (typeof window === 'undefined' || !env.exportEnabled || !env.posthogToken) {
    return null;
  }

  if (!initialized) {
    posthog.init(env.posthogToken, buildPostHogInitOptions(env));
    initialized = true;
  }

  return posthog;
};

export const getPostHog = (): PostHog | null => {
  if (typeof window === 'undefined' || !initialized) {
    return null;
  }
  return posthog;
};

export const resetPostHogForTests = () => {
  initialized = false;
};

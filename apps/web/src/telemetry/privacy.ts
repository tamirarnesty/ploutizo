import type { SessionRecordingOptions } from 'posthog-js';
import type { WebTelemetryEnv } from './env';

/** Blocks session replay capture for finance-sensitive DOM subtrees. */
export const TELEMETRY_REPLAY_BLOCK_ATTR = 'data-ph-replay-block';

export const TELEMETRY_REPLAY_BLOCK_SELECTOR = `[${TELEMETRY_REPLAY_BLOCK_ATTR}]`;

export const buildSessionRecordingOptions = (): SessionRecordingOptions => ({
  maskAllInputs: true,
  maskTextSelector: '*',
  blockClass: 'ph-no-capture',
  blockSelector: TELEMETRY_REPLAY_BLOCK_SELECTOR,
});

export const buildPostHogInitOptions = (env: WebTelemetryEnv) =>
  ({
    api_host: env.posthogHost,
    defaults: '2026-01-30',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    mask_all_element_attributes: true,
    session_recording: buildSessionRecordingOptions(),
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
    },
    logs: {
      captureConsoleLogs: false,
      serviceName: env.serviceName,
      environment: env.appEnv,
      serviceVersion: env.release,
    },
  }) as const;

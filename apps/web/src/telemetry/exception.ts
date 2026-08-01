import type { TelemetryOperation, TelemetrySurface } from '@ploutizo/telemetry';
import { getPostHog } from './posthogClient';

export interface BrowserExceptionContext {
  operation: TelemetryOperation;
  surface: TelemetrySurface;
  boundary?: string;
  route?: string;
}

const toExceptionProperties = (
  context: BrowserExceptionContext
): Record<string, string> => {
  const properties: Record<string, string> = {
    'telemetry.operation': context.operation,
    'telemetry.surface': context.surface,
  };

  if (context.boundary) {
    properties['telemetry.boundary'] = context.boundary;
  }
  if (context.route) {
    properties['telemetry.route'] = context.route;
  }

  return properties;
};

/** Record a breadcrumb attached to the next captured browser exception. */
export const addTelemetryExceptionStep = (
  message: string,
  context?: Partial<BrowserExceptionContext>
) => {
  try {
    const posthog = getPostHog();
    if (!posthog) {
      return;
    }

    posthog.addExceptionStep(
      message,
      context
        ? {
            ...(context.operation
              ? { 'telemetry.operation': context.operation }
              : {}),
            ...(context.surface ? { 'telemetry.surface': context.surface } : {}),
            ...(context.boundary
              ? { 'telemetry.boundary': context.boundary }
              : {}),
            ...(context.route ? { 'telemetry.route': context.route } : {}),
          }
        : undefined
    );
  } catch {
    // Telemetry must never affect product behavior.
  }
};

/** Capture a browser exception with safe operation/surface context. */
export const captureBrowserException = (
  error: unknown,
  context: BrowserExceptionContext
) => {
  try {
    const posthog = getPostHog();
    if (!posthog) {
      return;
    }

    posthog.captureException(error, toExceptionProperties(context));
  } catch {
    // Telemetry must never affect product behavior.
  }
};

export const getPostHogCorrelationHeaders = (): Record<string, string> => {
  try {
    const posthog = getPostHog();
    if (!posthog) {
      return {};
    }

    const sessionId = posthog.get_session_id();
    const distinctId = posthog.get_distinct_id();
    const headers: Record<string, string> = {};

    if (sessionId) {
      headers['X-POSTHOG-SESSION-ID'] = sessionId;
    }
    if (distinctId) {
      headers['X-POSTHOG-DISTINCT-ID'] = distinctId;
    }

    return headers;
  } catch {
    return {};
  }
};

import { getApiTracer } from './otel';
import { startServiceSpan as startServiceSpanWithTracer } from './spanHandle';
import type { RequestSpanHandle } from './spanHandle';

export {
  resolveApiTelemetryEnv,
  type AppDeploymentEnv,
  type ApiTelemetryEnv,
} from './env';
export {
  REQUEST_ID_HEADER,
  OPERATION_ID_HEADER,
  POSTHOG_SESSION_ID_HEADER,
  POSTHOG_DISTINCT_ID_HEADER,
  TELEMETRY_EXPOSE_HEADERS,
} from './headers';
export {
  initApiOtel,
  shutdownApiOtel,
  forceFlushApiOtel,
  getApiTracer,
  getApiTelemetryEnv,
} from './otel';
export {
  requestTelemetry,
  type RequestTelemetryMiddlewareOptions,
} from './requestTelemetry';
export {
  resolveNormalizedRoute,
  scrubPathToTemplate,
} from './routeTemplate';
export {
  startRootSpan,
  createNoopSpanHandle,
  type RequestSpanHandle,
} from './spanHandle';
export { createApiTelemetryClient } from './createApiTelemetryClient';
export type {
  RequestTelemetryState,
  RequestTelemetryVariables,
  TelemetryErrorContext,
} from './requestContext';

/**
 * Enrich the active request with a high-level service span.
 * Omit SQL, bound params, bodies, credentials, and domain identifiers.
 */
export const startServiceSpan = (
  name: string,
  attributes?: Record<string, string | number | boolean>
): RequestSpanHandle =>
  startServiceSpanWithTracer(getApiTracer(), name, attributes);

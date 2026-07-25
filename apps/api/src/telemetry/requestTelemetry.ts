import { createMiddleware } from 'hono/factory';
import {
  classifyApiOutcome,
  createConsoleTelemetryClient,
  createNoopTelemetryClient,
  parseCorrelationId,
  resolveCorrelationId,
  toApiRequestCompleteAttributes,
} from '@ploutizo/telemetry';
import type {
  HttpMethod,
  TelemetryClient,
  TelemetryLevel,
  TelemetryOutcome,
} from '@ploutizo/telemetry';
import { createApiTelemetryClient } from './createApiTelemetryClient';
import {
  OPERATION_ID_HEADER,
  POSTHOG_DISTINCT_ID_HEADER,
  POSTHOG_SESSION_ID_HEADER,
  REQUEST_ID_HEADER,
} from './headers';
import { getApiTelemetryEnv, getApiTracer } from './otel';
import { resolveNormalizedRoute } from './routeTemplate';
import { createNoopSpanHandle, startRootSpan } from './spanHandle';
import type {
  RequestTelemetryState,
  TelemetryErrorContext,
} from './requestContext';
import type { ApiTelemetryEnv } from './env';
import type { RequestSpanHandle } from './spanHandle';
import type { AppEnv } from '../types';

const HTTP_METHODS = new Set<HttpMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

const FLUSH_BUDGET_MS = 50;

export interface RequestTelemetryMiddlewareOptions {
  env?: ApiTelemetryEnv;
  now?: () => number;
  createClient?: (input: {
    requestId: string;
    operationId?: string;
    span: RequestSpanHandle;
    env: ApiTelemetryEnv;
  }) => TelemetryClient;
  startSpan?: (input: {
    requestId: string;
    operationId?: string;
    method: string;
    path: string;
    env: ApiTelemetryEnv;
  }) => RequestSpanHandle;
}

const asHttpMethod = (method: string): HttpMethod | undefined =>
  HTTP_METHODS.has(method as HttpMethod) ? (method as HttpMethod) : undefined;

const outcomeForStatus = (status: number): TelemetryOutcome => {
  if (status >= 500) return 'failure';
  if (status >= 400) return 'failure';
  return 'success';
};

const levelForOutcome = (
  outcome: TelemetryOutcome,
  reportable: boolean
): TelemetryLevel => {
  if (reportable) return 'error';
  if (outcome === 'failure') return 'warn';
  return 'info';
};

const fireAndForgetFlush = (client: TelemetryClient) => {
  void Promise.race([
    client.flush().catch(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(resolve, FLUSH_BUDGET_MS);
    }),
  ]);
};

const defaultCreateClient: NonNullable<
  RequestTelemetryMiddlewareOptions['createClient']
> = ({ span, env }) => {
  try {
    if (env.exportEnabled) {
      return createApiTelemetryClient({ env, span });
    }
    if (env.appEnv === 'local') {
      return createConsoleTelemetryClient({ prefix: '[api-telemetry]' });
    }
    return createNoopTelemetryClient();
  } catch {
    return createNoopTelemetryClient();
  }
};

const defaultStartSpan: NonNullable<
  RequestTelemetryMiddlewareOptions['startSpan']
> = ({ requestId, operationId, method, path, env }) => {
  try {
    return startRootSpan(getApiTracer(), {
      name: 'api.request',
      attributes: {
        'http.method': method,
        'url.path': path,
        'request.id': requestId,
        'deployment.environment': env.appEnv,
        'service.name': env.serviceName,
        ...(operationId ? { 'operation.id': operationId } : {}),
        ...(env.release ? { 'service.release': env.release } : {}),
      },
    });
  } catch {
    return createNoopSpanHandle();
  }
};

/**
 * Request-scoped telemetry middleware.
 *
 * Placement invariant: after CORS, before Clerk.
 * Emits one `api.request.complete` wide record per request.
 */
export const requestTelemetry = (
  options: RequestTelemetryMiddlewareOptions = {}
) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const env = options.env ?? getApiTelemetryEnv();
    const now = options.now ?? Date.now;
    const startedAt = now();

    const requestId = resolveCorrelationId(c.req.header(REQUEST_ID_HEADER));
    const operationId =
      parseCorrelationId(c.req.header(OPERATION_ID_HEADER)) ?? undefined;
    const posthogSessionId =
      c.req.header(POSTHOG_SESSION_ID_HEADER)?.trim() || undefined;
    const posthogDistinctId =
      c.req.header(POSTHOG_DISTINCT_ID_HEADER)?.trim() || undefined;

    c.header(REQUEST_ID_HEADER, requestId);

    const span = (options.startSpan ?? defaultStartSpan)({
      requestId,
      operationId,
      method: c.req.method,
      path: c.req.path,
      env,
    });

    if (posthogSessionId) {
      span.setAttributes({ 'posthog.session_id': posthogSessionId });
    }
    if (posthogDistinctId) {
      span.setAttributes({ 'posthog.distinct_id': posthogDistinctId });
    }

    const client = (options.createClient ?? defaultCreateClient)({
      requestId,
      operationId,
      span,
      env,
    });

    const state: RequestTelemetryState = {
      requestId,
      operationId,
      client,
      span,
      posthogSessionId,
      posthogDistinctId,
    };

    c.set('requestId', requestId);
    if (operationId) c.set('operationId', operationId);
    c.set('telemetry', client);
    c.set('requestTelemetry', state);

    try {
      await span.withActive(async () => {
        await next();
      });
    } finally {
      try {
        const status = c.res.status;
        const route = resolveNormalizedRoute(c);
        const method = asHttpMethod(c.req.method);
        const durationMs = Math.max(0, now() - startedAt);
        const errorContext: TelemetryErrorContext | undefined =
          c.get('telemetryError') ?? state.error;

        const classification = classifyApiOutcome({
          status,
          code: errorContext?.code,
          kind: errorContext?.kind ?? 'http',
          escalate: errorContext?.escalate,
        });

        const outcome = outcomeForStatus(status);
        const level = levelForOutcome(outcome, classification.reportable);

        span.setAttributes({
          'http.status_code': status,
          'http.route': route,
          'telemetry.classification': classification.classification,
        });

        if (classification.reportable) {
          span.setStatus('error');
          if (errorContext?.message) {
            span.recordException(new Error(errorContext.message));
          } else {
            span.recordException(
              new Error(`Unexpected API outcome ${status}`)
            );
          }
        } else {
          span.setStatus('ok');
        }

        client.record({
          operation: 'api.request.complete',
          surface: 'api.request',
          level,
          outcome,
          requestId,
          operationId,
          durationMs,
          message: errorContext?.message,
          attributes: toApiRequestCompleteAttributes({
            status,
            method,
            route,
            code: errorContext?.code,
            kind: errorContext?.kind ?? 'http',
            classification: classification.classification,
          }),
        });
      } catch {
        // Completion emission must never alter the response.
      } finally {
        span.end();
        fireAndForgetFlush(client);
      }
    }
  });

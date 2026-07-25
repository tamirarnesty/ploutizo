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
import {
  readErrorContextFromResponse,
  sanitizeCorrelationHeader,
} from './readErrorContext';
import { resolveNormalizedRoute, scrubPathToTemplate } from './routeTemplate';
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

const describeOutcome = (
  status: number,
  reportable: boolean
): { outcome: TelemetryOutcome; level: TelemetryLevel } => {
  if (reportable) return { outcome: 'failure', level: 'error' };
  if (status >= 400) return { outcome: 'failure', level: 'warn' };
  return { outcome: 'success', level: 'info' };
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
    if (env.mirrorConsole) {
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
        // Scrub before attach — never export raw entity IDs on spans.
        'http.route': scrubPathToTemplate(path),
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
    const posthogSessionId = sanitizeCorrelationHeader(
      c.req.header(POSTHOG_SESSION_ID_HEADER)
    );
    const posthogDistinctId = sanitizeCorrelationHeader(
      c.req.header(POSTHOG_DISTINCT_ID_HEADER)
    );

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
        const explicitError = c.get('telemetryError');
        const errorContext: TelemetryErrorContext | undefined =
          explicitError ?? (await readErrorContextFromResponse(c));

        const classification = classifyApiOutcome({
          status,
          code: errorContext?.code,
          kind: errorContext?.kind ?? 'http',
          escalate: errorContext?.escalate,
        });
        const { outcome, level } = describeOutcome(
          status,
          classification.reportable
        );

        span.setAttributes({
          'http.status_code': status,
          'http.route': route,
          'telemetry.classification': classification.classification,
          'telemetry.operation': 'api.request.complete',
          'telemetry.outcome': outcome,
        });

        if (classification.reportable) {
          span.setStatus('error');
          span.recordException(
            new Error(
              errorContext?.message ?? `Unexpected API outcome ${status}`
            )
          );
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

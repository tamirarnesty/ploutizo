import { DomainError, NotFoundError } from './errors';
import type { Context, Env, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { TelemetryErrorContext } from '../telemetry/requestContext';

export interface ApiErrorBody {
  error: {
    code: string;
    message?: string;
    errors?: unknown;
    details?: unknown;
  };
}

/** JSON error response plus request-scoped telemetry context (no response clone). */
export const respondWithApiError = (
  c: Context,
  input: {
    code: string;
    status: ContentfulStatusCode;
    message?: string;
    errors?: unknown;
    details?: unknown;
  } & Pick<TelemetryErrorContext, 'kind' | 'escalate'>
) => {
  c.set('telemetryError', {
    code: input.code,
    kind: input.kind ?? 'http',
    ...(input.escalate ? { escalate: true } : {}),
  });

  const body: ApiErrorBody = { error: { code: input.code } };
  if (input.message) body.error.message = input.message;
  if (input.errors !== undefined) body.error.errors = input.errors;
  if (input.details !== undefined) body.error.details = input.details;

  return c.json(body, input.status);
};

export const handleApiError = (err: unknown, c: Context) => {
  if (err instanceof NotFoundError) {
    return respondWithApiError(c, {
      code: 'NOT_FOUND',
      message: err.message,
      status: 404,
    });
  }
  if (err instanceof DomainError) {
    const code = err.code ?? 'DOMAIN_ERROR';
    return respondWithApiError(c, {
      code,
      message: err.message,
      status: err.statusCode as ContentfulStatusCode,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }
  console.error('[API] Unhandled error:', err);
  return respondWithApiError(c, {
    code: 'INTERNAL_ERROR',
    message: 'Unexpected error',
    status: 500,
  });
};

/** Shared notFound + onError handlers for production and tests. */
export const registerApiErrorHandlers = <TEnv extends Env>(app: Hono<TEnv>) => {
  app.notFound((c) =>
    respondWithApiError(c, {
      code: 'NOT_FOUND',
      message: 'Not found',
      status: 404,
    })
  );
  app.onError((err, c) => handleApiError(err, c));
};

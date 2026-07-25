import type { Context } from 'hono';
import type { TelemetryErrorContext } from './requestContext';

const MAX_CORRELATION_HEADER_LENGTH = 128;

/**
 * Bound untrusted correlation header values before attaching to spans/logs.
 */
export const sanitizeCorrelationHeader = (
  value: string | undefined
): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_CORRELATION_HEADER_LENGTH) {
    return trimmed.slice(0, MAX_CORRELATION_HEADER_LENGTH);
  }
  return trimmed;
};

/**
 * Recover a machine error code from JSON error responses when handlers did not
 * explicitly set `telemetryError` (tenant guard, validators, route-level c.json).
 */
export const readErrorContextFromResponse = async (
  c: Context
): Promise<TelemetryErrorContext | undefined> => {
  if (c.res.status < 400) return undefined;

  try {
    const contentType = c.res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return undefined;

    const body = (await c.res.clone().json()) as {
      error?: { code?: unknown; message?: unknown };
    };
    const code = body.error?.code;
    if (typeof code !== 'string' || !code.trim()) return undefined;

    const message =
      typeof body.error?.message === 'string' ? body.error.message : undefined;

    return {
      code: code.trim(),
      kind: 'http',
      message,
    };
  } catch {
    return undefined;
  }
};

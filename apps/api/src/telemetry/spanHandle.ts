import { SpanStatusCode, context, trace } from '@opentelemetry/api';
import type { Span, Tracer } from '@opentelemetry/api';

export type RequestSpanStatus = 'ok' | 'error';

export interface RequestSpanHandle {
  setAttributes: (
    attributes: Record<string, string | number | boolean>
  ) => void;
  recordException: (error: unknown) => void;
  setStatus: (status: RequestSpanStatus) => void;
  end: () => void;
  traceId: string | undefined;
  spanId: string | undefined;
  /** Run work with this span as the active OTel context. */
  withActive: <T>(fn: () => Promise<T>) => Promise<T>;
}

export interface StartRootSpanInput {
  name: string;
  attributes?: Record<string, string | number | boolean>;
}

const toOtelException = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : 'Unknown error');
};

export const createSpanHandle = (span: Span): RequestSpanHandle => {
  const spanContext = span.spanContext();
  return {
    setAttributes: (attributes) => {
      try {
        span.setAttributes(attributes);
      } catch {
        // Telemetry must never affect product behavior.
      }
    },
    recordException: (error) => {
      try {
        span.recordException(toOtelException(error));
      } catch {
        // ignore
      }
    },
    setStatus: (status) => {
      try {
        span.setStatus({
          code: status === 'error' ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        });
      } catch {
        // ignore
      }
    },
    end: () => {
      try {
        span.end();
      } catch {
        // ignore
      }
    },
    traceId: spanContext.traceId || undefined,
    spanId: spanContext.spanId || undefined,
    withActive: (fn) => context.with(trace.setSpan(context.active(), span), fn),
  };
};

export const createNoopSpanHandle = (): RequestSpanHandle => ({
  setAttributes: () => {},
  recordException: () => {},
  setStatus: () => {},
  end: () => {},
  traceId: undefined,
  spanId: undefined,
  withActive: (fn) => fn(),
});

export const startRootSpan = (
  tracer: Tracer,
  input: StartRootSpanInput
): RequestSpanHandle => {
  try {
    const span = tracer.startSpan(input.name, {
      attributes: input.attributes,
    });
    return createSpanHandle(span);
  } catch {
    return createNoopSpanHandle();
  }
};

/**
 * Start a high-level child span under the active request context.
 * Callers must omit SQL, params, bodies, credentials, and domain identifiers.
 */
export const startServiceSpan = (
  tracer: Tracer,
  name: string,
  attributes?: Record<string, string | number | boolean>
): RequestSpanHandle => {
  try {
    const span = tracer.startSpan(name, { attributes });
    return createSpanHandle(span);
  } catch {
    return createNoopSpanHandle();
  }
};

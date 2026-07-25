import { logs } from '@opentelemetry/api-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';
import { resolveApiTelemetryEnv } from './env';
import type { Tracer } from '@opentelemetry/api';
import type { ApiTelemetryEnv } from './env';

export interface ApiOtelRuntime {
  tracer: Tracer;
  loggerProvider: LoggerProvider | undefined;
  env: ApiTelemetryEnv;
  forceFlush: () => Promise<void>;
  /** Bounded, non-blocking shutdown used on process exit. */
  shutdown: () => Promise<void>;
}

let runtime: ApiOtelRuntime | undefined;

const FLUSH_TIMEOUT_MS = 2_000;

const withTimeout = async (
  work: Promise<unknown>,
  timeoutMs: number
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work.then(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Initialize API OpenTelemetry exporters to PostHog.
 * Safe to call once at process boot; failures degrade to a local tracer.
 */
export const initApiOtel = (
  env: ApiTelemetryEnv = resolveApiTelemetryEnv()
): ApiOtelRuntime => {
  if (runtime) return runtime;

  const resourceAttrs: Record<string, string> = {
    [ATTR_SERVICE_NAME]: env.serviceName,
    'deployment.environment': env.appEnv,
    'service.namespace': 'ploutizo',
  };
  if (env.release) {
    resourceAttrs[ATTR_SERVICE_VERSION] = env.release;
    resourceAttrs['service.release'] = env.release;
  }

  const resource = resourceFromAttributes(resourceAttrs);

  let tracerProvider: NodeTracerProvider | undefined;
  let loggerProvider: LoggerProvider | undefined;

  try {
    if (env.exportEnabled && env.posthogToken) {
      const authHeaders = {
        Authorization: `Bearer ${env.posthogToken}`,
      };

      const traceExporter = new OTLPTraceExporter({
        url: `${env.posthogHost}/i/v1/traces`,
        headers: authHeaders,
      });

      tracerProvider = new NodeTracerProvider({
        resource,
        spanProcessors: [
          new BatchSpanProcessor(traceExporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5_000,
            exportTimeoutMillis: FLUSH_TIMEOUT_MS,
          }),
        ],
      });
      tracerProvider.register();

      const logExporter = new OTLPLogExporter({
        url: `${env.posthogHost}/i/v1/logs`,
        headers: authHeaders,
      });
      loggerProvider = new LoggerProvider({
        resource,
        processors: [
          new BatchLogRecordProcessor({
            exporter: logExporter,
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5_000,
            exportTimeoutMillis: FLUSH_TIMEOUT_MS,
          }),
        ],
      });
      logs.setGlobalLoggerProvider(loggerProvider);
    } else {
      // Local/no-token: still register a tracer provider so spans form locally
      // without exporting. Completion logs go through the console client.
      tracerProvider = new NodeTracerProvider({ resource });
      tracerProvider.register();
    }
  } catch (error) {
    console.error(
      '[telemetry] OTel initialization failed; using no-op tracer',
      {
        message: error instanceof Error ? error.message : String(error),
      }
    );
    try {
      tracerProvider = new NodeTracerProvider({ resource });
      tracerProvider.register();
    } catch {
      // Absolute fallback — getTracer still returns a no-op tracer.
    }
  }

  const tracer = trace.getTracer(env.serviceName);

  const forceFlush = async () => {
    try {
      await withTimeout(
        Promise.all([
          tracerProvider?.forceFlush() ?? Promise.resolve(),
          loggerProvider?.forceFlush() ?? Promise.resolve(),
        ]),
        FLUSH_TIMEOUT_MS
      );
    } catch {
      // ignore flush failures
    }
  };

  runtime = {
    tracer,
    loggerProvider,
    env,
    forceFlush,
    shutdown: async () => {
      try {
        await withTimeout(
          Promise.all([
            tracerProvider?.shutdown() ?? Promise.resolve(),
            loggerProvider?.shutdown() ?? Promise.resolve(),
          ]),
          FLUSH_TIMEOUT_MS
        );
      } catch {
        // ignore shutdown failures
      }
    },
  };

  return runtime;
};

export const getApiTracer = (): Tracer =>
  runtime?.tracer ?? trace.getTracer('ploutizo-api');

export const getApiTelemetryEnv = (): ApiTelemetryEnv =>
  runtime?.env ?? resolveApiTelemetryEnv();

export const forceFlushApiOtel = async (): Promise<void> => {
  if (!runtime) return;
  await runtime.forceFlush();
};

export const shutdownApiOtel = async (): Promise<void> => {
  if (!runtime) return;
  const current = runtime;
  runtime = undefined;
  await current.shutdown();
};

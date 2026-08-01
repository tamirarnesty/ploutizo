import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import {
  createConsoleTelemetryClient,
  prepareTelemetryRecord,
} from '@ploutizo/telemetry';
import type {
  SafeTelemetryRecord,
  TelemetryClient,
  TelemetryEventInput,
  TelemetryLevel,
} from '@ploutizo/telemetry';
import { forceFlushApiOtel } from './otel';
import type { ApiTelemetryEnv } from './env';
import type { RequestSpanHandle } from './spanHandle';

export interface CreateApiTelemetryClientOptions {
  env: ApiTelemetryEnv;
  span: RequestSpanHandle;
  /** When true, also mirror records to console. Defaults to env.mirrorConsole. */
  mirrorConsole?: boolean;
  consoleClient?: TelemetryClient;
}

const levelToSeverity = (
  level: TelemetryLevel
): { severityNumber: SeverityNumber; severityText: string } => {
  switch (level) {
    case 'debug':
      return { severityNumber: SeverityNumber.DEBUG, severityText: 'DEBUG' };
    case 'warn':
      return { severityNumber: SeverityNumber.WARN, severityText: 'WARN' };
    case 'error':
      return { severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' };
    case 'info':
    default:
      return { severityNumber: SeverityNumber.INFO, severityText: 'INFO' };
  }
};

const toLogAttributes = (
  record: SafeTelemetryRecord,
  env: ApiTelemetryEnv,
  span: RequestSpanHandle
): Record<string, string | number | boolean> => {
  const attributes: Record<string, string | number | boolean> = {
    'telemetry.operation': record.operation,
    'telemetry.surface': record.surface,
    'deployment.environment': env.appEnv,
    'service.name': env.serviceName,
  };

  if (env.release) attributes['service.release'] = env.release;
  if (record.outcome) attributes['telemetry.outcome'] = record.outcome;
  if (record.requestId) attributes['request.id'] = record.requestId;
  if (record.operationId) attributes['operation.id'] = record.operationId;
  if (typeof record.durationMs === 'number') {
    attributes['duration.ms'] = record.durationMs;
  }
  if (span.traceId) attributes['trace_id'] = span.traceId;
  if (span.spanId) attributes['span_id'] = span.spanId;

  for (const [key, value] of Object.entries(record.attributes)) {
    if (value === null) continue;
    attributes[`attr.${key}`] = value;
  }

  return attributes;
};

/**
 * Request-scoped TelemetryClient that emits OTel logs correlated to the root span.
 * Explicit local environments may also mirror to the console adapter.
 */
export const createApiTelemetryClient = (
  options: CreateApiTelemetryClientOptions
): TelemetryClient => {
  const mirrorConsole = options.mirrorConsole ?? options.env.mirrorConsole;
  const consoleClient =
    options.consoleClient ??
    (mirrorConsole
      ? createConsoleTelemetryClient({ prefix: '[api-telemetry]' })
      : undefined);

  const logger = logs.getLogger(options.env.serviceName);

  const record = (event: TelemetryEventInput) => {
    try {
      const telemetryRecord = prepareTelemetryRecord(event);
      const attributes = toLogAttributes(
        telemetryRecord,
        options.env,
        options.span
      );

      if (options.env.exportEnabled) {
        const severity = levelToSeverity(telemetryRecord.level);
        logger.emit({
          body: telemetryRecord.message ?? telemetryRecord.operation,
          severityNumber: severity.severityNumber,
          severityText: severity.severityText,
          attributes,
        });
      }

      consoleClient?.record(event);
    } catch {
      // Telemetry must never affect product behavior.
    }
  };

  return {
    record,
    flush: async () => {
      try {
        await Promise.all([
          consoleClient?.flush() ?? Promise.resolve(),
          options.env.exportEnabled ? forceFlushApiOtel() : Promise.resolve(),
        ]);
      } catch {
        // ignore
      }
    },
  };
};

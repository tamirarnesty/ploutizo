import type { SafeTelemetryRecord } from '@ploutizo/telemetry';
import type { WebTelemetryEnv } from './env';

export const toPostHogLogAttributes = (
  record: SafeTelemetryRecord,
  env: WebTelemetryEnv
): Record<string, string | number | boolean> => {
  const attributes: Record<string, string | number | boolean> = {
    'telemetry.operation': record.operation,
    'telemetry.surface': record.surface,
    'deployment.environment': env.appEnv,
    'service.name': env.serviceName,
  };

  if (env.release) {
    attributes['service.release'] = env.release;
  }
  if (record.outcome) {
    attributes['telemetry.outcome'] = record.outcome;
  }
  if (record.operationId) {
    attributes['operation.id'] = record.operationId;
  }
  if (record.requestId) {
    attributes['request.id'] = record.requestId;
  }
  if (typeof record.durationMs === 'number') {
    attributes['duration.ms'] = record.durationMs;
  }

  for (const [key, value] of Object.entries(record.attributes)) {
    if (value === null) continue;
    attributes[`attr.${key}`] = value;
  }

  return attributes;
};

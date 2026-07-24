export {
  TELEMETRY_SURFACES,
  TELEMETRY_OPERATIONS,
  TelemetryCatalogError,
  assertTelemetryCatalogEntry,
  isTelemetryOperation,
  isTelemetrySurface,
  type TelemetryOperation,
  type TelemetrySurface,
  type TelemetryCatalogEntry,
} from './catalog';

export {
  SANITIZE_MAX_DEPTH,
  SANITIZE_MAX_KEYS,
  SANITIZE_MAX_ARRAY_LENGTH,
  SANITIZE_MAX_STRING_LENGTH,
  SANITIZE_MAX_TOTAL_BYTES,
  REDACTED,
  OMITTED,
  TRUNCATED,
  sanitizeAttributes,
  isProhibitedAttributeKey,
  type SanitizeOptions,
  type SanitizeResult,
  type SanitizedAttributeValue,
} from './sanitize';

export {
  TELEMETRY_CORRELATION_HEADERS,
  createOperationId,
  createRequestId,
  isValidCorrelationId,
  parseCorrelationId,
  resolveCorrelationId,
  type TelemetryCorrelationHeader,
} from './ids';

export {
  TelemetryApiError,
  EXPECTED_API_ERROR_CODES,
  EXPECTED_HTTP_STATUSES,
  classifyApiError,
  isTelemetryApiError,
  toSafeApiErrorAttributes,
  type TelemetryApiErrorInit,
  type TelemetryApiErrorKind,
  type TelemetryErrorClassification,
  type ClassifyApiErrorInput,
  type ExpectedApiErrorCode,
} from './api-error';

export {
  prepareTelemetryRecord,
  type TelemetryClient,
  type TelemetryEventInput,
  type TelemetryLevel,
  type TelemetryOutcome,
  type SafeTelemetryRecord,
  type PrepareTelemetryRecordOptions,
} from './contract';

export {
  createConsoleTelemetryClient,
  type ConsoleTelemetryClientOptions,
  type ConsoleTelemetrySink,
} from './adapters/console';

export { createNoopTelemetryClient } from './adapters/noop';

export {
  createFakeTelemetryClient,
  type FakeTelemetryClient,
  type FakeTelemetryClientOptions,
} from './adapters/fake';

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
  type HttpMethod,
  type HttpOutcomeAttributes,
  type OperationLifecycleAttributes,
  type ApiRequestCompleteAttributes,
  type BrowserApiRequestAttributes,
  type RoutePreloadAttributes,
  type SectionSurfaceAttributes,
  type DomainListAttributes,
  type DomainReadAttributes,
  type DomainMutationAttributes,
  type TelemetryAttributeMap,
  type TelemetryAttributes,
} from './attributes';

export {
  TELEMETRY_CORRELATION_HEADERS,
  createCorrelationId,
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
  type SafeApiErrorAttributes,
} from './api-error';

export {
  prepareTelemetryRecord,
  trimMessage,
  type TelemetryAttributeValue,
  type TelemetryClient,
  type TelemetryEventInput,
  type TelemetryLevel,
  type TelemetryOutcome,
  type SafeTelemetryRecord,
} from './contract';

export {
  asRecordSink,
  composeRecordSinks,
  createSinkTelemetryClient,
  emitMessage,
  safeEmitRecord,
  type TelemetryLevelSink,
  type TelemetryRecordSink,
  type SinkTelemetryClientOptions,
} from './emit';

export {
  createConsoleLevelSink,
  createConsoleTelemetryClient,
  type ConsoleTelemetryClientOptions,
  type ConsoleTelemetrySink,
} from './adapters/console';

export { createNoopTelemetryClient } from './adapters/noop';

export {
  createFakeTelemetryClient,
  type FakeTelemetryClient,
} from './adapters/fake';

export {
  createPostHogLevelSink,
  createPostHogTelemetryClient,
  createLocalTelemetryClient,
  type PostHogLogger,
  type PostHogTelemetryBridge,
  type PostHogTelemetryClientOptions,
} from './adapters/posthog';

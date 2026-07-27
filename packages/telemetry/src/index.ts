export {
  TELEMETRY_SURFACES,
  TELEMETRY_OPERATIONS,
  TelemetryCatalogError,
  assertTelemetryCatalogEntry,
  isTelemetryOperation,
  isTelemetrySurface,
  type TelemetryOperation,
  type TelemetrySurface,
  type TelemetrySurfaceForOperation,
  type TelemetryCatalogEntry,
} from './catalog';

export {
  type HttpMethod,
  type HttpOutcomeAttributes,
  type ApiRequestCompleteAttributes,
  type BrowserApiRequestAttributes,
  type RoutePreloadAttributes,
  type SectionSurfaceAttributes,
  type TelemetryAttributeMap,
  type TelemetryAttributes,
} from './attributes';

export {
  createCorrelationId,
  isValidCorrelationId,
  parseCorrelationId,
  resolveCorrelationId,
} from './ids';

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
  createConsoleTelemetryClient,
  type ConsoleTelemetryClientOptions,
  type ConsoleTelemetrySink,
} from './adapters/console';

export { createNoopTelemetryClient } from './adapters/noop';

import type { TelemetryOperation } from './catalog';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Operation-scoped attribute schemas — flat optional primitives only.
 * Nested objects/arrays are intentionally unsupported; omit sensitive fields at the caller.
 */

/** HTTP outcome fields — route must be a template (`/api/items/:id`), never raw IDs. */
export interface HttpOutcomeAttributes {
  status?: number;
  method?: HttpMethod;
  route?: string;
  retryCount?: number;
  attempt?: number;
}

export interface ApiRequestCompleteAttributes extends HttpOutcomeAttributes {
  classification?: 'expected' | 'unexpected';
  code?: string;
  kind?: 'http' | 'network' | 'malformed' | 'unknown';
  /** Deployment environment resource label (`local` | `preview` | `production`). */
  environment?: string;
  /** Service name resource label (e.g. `ploutizo-api`). */
  service?: string;
  /** Release/version resource label when known. */
  release?: string;
  /** Active OTel trace id when a root span is present. */
  traceId?: string;
  /** Active OTel span id when a root span is present. */
  spanId?: string;
}
export type BrowserApiRequestAttributes = HttpOutcomeAttributes;

export interface RoutePreloadAttributes {
  route?: string;
}

export interface SectionSurfaceAttributes {
  route?: string;
  boundary?: string;
}

export type TelemetryAttributeMap = {
  'browser.api_request': BrowserApiRequestAttributes;
  'browser.api_request.retry': BrowserApiRequestAttributes;
  'api.request.complete': ApiRequestCompleteAttributes;
  'route.preload': RoutePreloadAttributes;
  'section.render': SectionSurfaceAttributes;
  'section.recover': SectionSurfaceAttributes;
};

export type TelemetryAttributes<TOperation extends TelemetryOperation> =
  TelemetryAttributeMap[TOperation];

type _AssertAllOperationsMapped = [
  Exclude<TelemetryOperation, keyof TelemetryAttributeMap>,
] extends [never]
  ? true
  : [
      'Missing operation attribute schema:',
      Exclude<TelemetryOperation, keyof TelemetryAttributeMap>,
    ];

type _AssertAllSchemasHaveOperations = [
  Exclude<keyof TelemetryAttributeMap, TelemetryOperation>,
] extends [never]
  ? true
  : [
      'Orphan attribute schema for unknown operation:',
      Exclude<keyof TelemetryAttributeMap, TelemetryOperation>,
    ];

const _allOperationsMapped: _AssertAllOperationsMapped = true;
const _allSchemasHaveOperations: _AssertAllSchemasHaveOperations = true;

void _allOperationsMapped;
void _allSchemasHaveOperations;

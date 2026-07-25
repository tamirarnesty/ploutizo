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

export interface OperationLifecycleAttributes {
  phase?: 'start' | 'complete' | 'fail';
}

export interface ApiRequestCompleteAttributes extends HttpOutcomeAttributes {
  classification?: 'expected' | 'unexpected';
  code?: string;
  kind?: 'http' | 'network' | 'malformed' | 'unknown';
}

export type BrowserApiRequestAttributes = HttpOutcomeAttributes;

export interface RoutePreloadAttributes {
  route?: string;
}

export interface SectionSurfaceAttributes {
  route?: string;
  boundary?: string;
}

export interface DomainListAttributes {
  status?: number;
  count?: number;
}

export interface DomainReadAttributes {
  status?: number;
}

export interface DomainMutationAttributes extends HttpOutcomeAttributes {
  code?: string;
}

const OPERATION_LIFECYCLE = [
  'operation.start',
  'operation.complete',
  'operation.fail',
] as const;

const BROWSER_API_OPERATIONS = [
  'browser.api_request',
  'browser.api_request.retry',
] as const;

const ROUTE_SECTION_OPERATIONS = {
  'route.preload': {} as RoutePreloadAttributes,
  'section.render': {} as SectionSurfaceAttributes,
  'section.recover': {} as SectionSurfaceAttributes,
} as const;

const LIST_OPERATIONS = [
  'accounts.list',
  'transactions.list',
  'settlements.list',
  'imports.list',
  'households.members.list',
  'households.invitations.list',
  'categories.list',
  'tags.list',
  'merchant_rules.list',
] as const;

const READ_OPERATIONS = ['transactions.get', 'imports.get'] as const;

const MUTATION_OPERATIONS = [
  'accounts.create',
  'accounts.update',
  'accounts.archive',
  'transactions.create',
  'transactions.update',
  'transactions.delete',
  'transactions.restore',
  'settlements.create',
  'imports.create',
  'imports.review',
  'imports.finalize',
  'households.invite',
  'households.member.remove',
  'households.invitation.revoke',
  'categories.create',
  'categories.update',
  'categories.archive',
  'tags.create',
  'tags.archive',
  'merchant_rules.create',
  'merchant_rules.update',
  'merchant_rules.reorder',
  'merchant_rules.archive',
] as const;

type LifecycleOperation = (typeof OPERATION_LIFECYCLE)[number];
type BrowserApiOperation = (typeof BROWSER_API_OPERATIONS)[number];
type ListOperation = (typeof LIST_OPERATIONS)[number];
type ReadOperation = (typeof READ_OPERATIONS)[number];
type MutationOperation = (typeof MUTATION_OPERATIONS)[number];
type RouteSectionOperation = keyof typeof ROUTE_SECTION_OPERATIONS;

export type TelemetryAttributeMap = {
  [K in LifecycleOperation]: OperationLifecycleAttributes;
} & {
  [K in BrowserApiOperation]: BrowserApiRequestAttributes;
} & {
  'api.request.complete': ApiRequestCompleteAttributes;
} & {
  [K in RouteSectionOperation]: (typeof ROUTE_SECTION_OPERATIONS)[K];
} & {
  [K in ListOperation]: DomainListAttributes;
} & {
  [K in ReadOperation]: DomainReadAttributes;
} & {
  [K in MutationOperation]: DomainMutationAttributes;
};

export type TelemetryAttributes<O extends TelemetryOperation> =
  TelemetryAttributeMap[O];

type _AssertAllOperationsMapped = [
  Exclude<TelemetryOperation, keyof TelemetryAttributeMap>,
] extends [never]
  ? true
  : [
      'Missing operation attribute schema:',
      Exclude<TelemetryOperation, keyof TelemetryAttributeMap>,
    ];

const _allOperationsMapped: _AssertAllOperationsMapped = true;

void _allOperationsMapped;

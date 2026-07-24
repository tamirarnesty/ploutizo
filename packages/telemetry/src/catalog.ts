/**
 * Typed operation/event catalog for vendor-neutral telemetry.
 * Callers must pick a stable operation and surface — free-form names are rejected.
 */

export const TELEMETRY_SURFACES = [
  // Browser product surfaces
  'web.root',
  'web.auth',
  'web.onboarding',
  'web.dashboard',
  'web.accounts',
  'web.transactions',
  'web.import',
  'web.import.review',
  'web.settings',
  'web.settings.household',
  'web.settings.categories',
  'web.settings.merchant_rules',
  // API product surfaces
  'api.request',
  'api.health',
  'api.webhooks',
  'api.accounts',
  'api.households',
  'api.categories',
  'api.tags',
  'api.merchant_rules',
  'api.transactions',
  'api.settlements',
  'api.imports',
] as const;

export type TelemetrySurface = (typeof TELEMETRY_SURFACES)[number];

export const TELEMETRY_OPERATIONS = [
  // Generic operation lifecycle (wide events)
  'operation.start',
  'operation.complete',
  'operation.fail',
  // Browser ↔ API correlation
  'browser.api_request',
  'browser.api_request.retry',
  'api.request.complete',
  // Route preload / section recovery (consumed by later issues)
  'route.preload',
  'section.render',
  'section.recover',
  // Domain capability names (stable across pages and releases)
  'accounts.list',
  'accounts.create',
  'accounts.update',
  'accounts.archive',
  'transactions.list',
  'transactions.get',
  'transactions.create',
  'transactions.update',
  'transactions.delete',
  'transactions.restore',
  'settlements.list',
  'settlements.create',
  'imports.list',
  'imports.create',
  'imports.get',
  'imports.review',
  'imports.finalize',
  'households.members.list',
  'households.invitations.list',
  'households.invite',
  'households.member.remove',
  'households.invitation.revoke',
  'categories.list',
  'categories.create',
  'categories.update',
  'categories.archive',
  'tags.list',
  'tags.create',
  'tags.archive',
  'merchant_rules.list',
  'merchant_rules.create',
  'merchant_rules.update',
  'merchant_rules.reorder',
  'merchant_rules.archive',
] as const;

export type TelemetryOperation = (typeof TELEMETRY_OPERATIONS)[number];

const surfaceSet: ReadonlySet<string> = new Set(TELEMETRY_SURFACES);
const operationSet: ReadonlySet<string> = new Set(TELEMETRY_OPERATIONS);

export const isTelemetrySurface = (
  value: unknown
): value is TelemetrySurface =>
  typeof value === 'string' && surfaceSet.has(value);

export const isTelemetryOperation = (
  value: unknown
): value is TelemetryOperation =>
  typeof value === 'string' && operationSet.has(value);

export class TelemetryCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryCatalogError';
  }
}

export interface TelemetryCatalogEntry {
  operation: TelemetryOperation;
  surface: TelemetrySurface;
}

/**
 * Validates that both operation and surface are catalog members.
 * Throws TelemetryCatalogError when either is unknown.
 */
export const assertTelemetryCatalogEntry = (input: {
  operation: unknown;
  surface: unknown;
}): TelemetryCatalogEntry => {
  if (!isTelemetryOperation(input.operation)) {
    throw new TelemetryCatalogError(
      `Unknown telemetry operation: ${String(input.operation)}`
    );
  }
  if (!isTelemetrySurface(input.surface)) {
    throw new TelemetryCatalogError(
      `Unknown telemetry surface: ${String(input.surface)}`
    );
  }
  return { operation: input.operation, surface: input.surface };
};

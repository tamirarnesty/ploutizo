/**
 * The first telemetry consumers use this catalog directly. Add domain operations
 * alongside their callers instead of pre-registering every product capability.
 */
const WEB_TELEMETRY_SURFACES = [
  'web.root',
  'web.dashboard',
  'web.accounts',
  'web.transactions',
  'web.import',
  'web.import.review',
] as const;

const API_TELEMETRY_SURFACES = ['api.request'] as const;

export const TELEMETRY_CATALOG = {
  'browser.api_request': { surfaces: WEB_TELEMETRY_SURFACES },
  'browser.api_request.retry': { surfaces: WEB_TELEMETRY_SURFACES },
  'api.request.complete': { surfaces: API_TELEMETRY_SURFACES },
  'route.preload': { surfaces: WEB_TELEMETRY_SURFACES },
  'section.render': { surfaces: WEB_TELEMETRY_SURFACES },
  'section.recover': { surfaces: WEB_TELEMETRY_SURFACES },
} as const;

export type TelemetryOperation = keyof typeof TELEMETRY_CATALOG;
export type TelemetrySurface =
  | (typeof WEB_TELEMETRY_SURFACES)[number]
  | (typeof API_TELEMETRY_SURFACES)[number];
export type TelemetrySurfaceForOperation<O extends TelemetryOperation> =
  (typeof TELEMETRY_CATALOG)[O]['surfaces'][number];

export const TELEMETRY_OPERATIONS = Object.keys(
  TELEMETRY_CATALOG
) as TelemetryOperation[];
export const TELEMETRY_SURFACES = [
  ...WEB_TELEMETRY_SURFACES,
  ...API_TELEMETRY_SURFACES,
] as const;

const surfaceSet: ReadonlySet<string> = new Set(TELEMETRY_SURFACES);

export const isTelemetrySurface = (value: unknown): value is TelemetrySurface =>
  typeof value === 'string' && surfaceSet.has(value);

export const isTelemetryOperation = (
  value: unknown
): value is TelemetryOperation =>
  typeof value === 'string' && value in TELEMETRY_CATALOG;

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
 * Validates a complete operation/surface pair.
 * Throws TelemetryCatalogError when either value is unknown or incompatible.
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
  const allowedSurfaces = TELEMETRY_CATALOG[input.operation].surfaces;
  if (!allowedSurfaces.includes(input.surface as never)) {
    throw new TelemetryCatalogError(
      `Telemetry surface ${input.surface} is not valid for ${input.operation}`
    );
  }
  return { operation: input.operation, surface: input.surface };
};

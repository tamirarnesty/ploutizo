import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_OPERATIONS,
  TELEMETRY_SURFACES,
  TelemetryCatalogError,
  assertTelemetryCatalogEntry,
  isTelemetryOperation,
  isTelemetrySurface,
} from '../catalog';
import { prepareTelemetryRecord } from '../contract';

describe('telemetry catalog', () => {
  it('exposes non-empty typed surface and operation catalogs', () => {
    expect(TELEMETRY_SURFACES.length).toBeGreaterThan(0);
    expect(TELEMETRY_OPERATIONS.length).toBeGreaterThan(0);
    expect(isTelemetrySurface('web.transactions')).toBe(true);
    expect(isTelemetryOperation('transactions.list')).toBe(true);
  });

  it('rejects unknown surfaces and operations', () => {
    expect(isTelemetrySurface('web.unknown')).toBe(false);
    expect(isTelemetryOperation('not.a.real.operation')).toBe(false);
  });

  it('assertTelemetryCatalogEntry accepts catalog members', () => {
    expect(
      assertTelemetryCatalogEntry({
        operation: 'accounts.list',
        surface: 'web.accounts',
      })
    ).toEqual({
      operation: 'accounts.list',
      surface: 'web.accounts',
    });
  });

  it('assertTelemetryCatalogEntry throws for unknown entries', () => {
    expect(() =>
      assertTelemetryCatalogEntry({
        operation: 'accounts.list',
        surface: 'not-a-surface',
      })
    ).toThrow(TelemetryCatalogError);

    expect(() =>
      assertTelemetryCatalogEntry({
        operation: 'not-an-operation',
        surface: 'api.accounts',
      })
    ).toThrow(TelemetryCatalogError);
  });

  it('prepareTelemetryRecord enforces catalog membership', () => {
    expect(() =>
      prepareTelemetryRecord({
        // @ts-expect-error intentional invalid operation for runtime enforcement
        operation: 'invented.operation',
        surface: 'web.dashboard',
      })
    ).toThrow(TelemetryCatalogError);
  });
});

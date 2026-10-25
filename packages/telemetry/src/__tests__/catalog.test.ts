import { describe, expect, it } from 'vitest';
import {
  TelemetryCatalogError,
  assertTelemetryCatalogEntry,
  isTelemetryOperation,
  isTelemetrySurface,
} from '../catalog';
import { prepareTelemetryRecord } from '../contract';

describe('telemetry catalog', () => {
  it('recognizes catalog surfaces and operations', () => {
    expect(isTelemetrySurface('web.transactions')).toBe(true);
    expect(isTelemetryOperation('browser.api_request')).toBe(true);
  });

  it('rejects unknown surfaces and operations', () => {
    expect(isTelemetrySurface('web.unknown')).toBe(false);
    expect(isTelemetryOperation('not.a.real.operation')).toBe(false);
  });

  it('assertTelemetryCatalogEntry accepts catalog members', () => {
    expect(
      assertTelemetryCatalogEntry({
        operation: 'browser.api_request',
        surface: 'web.accounts',
      })
    ).toEqual({
      operation: 'browser.api_request',
      surface: 'web.accounts',
    });
  });

  it('assertTelemetryCatalogEntry throws for unknown entries', () => {
    expect(() =>
      assertTelemetryCatalogEntry({
        operation: 'browser.api_request',
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

  it('rejects incompatible operation and surface pairs', () => {
    expect(() =>
      assertTelemetryCatalogEntry({
        operation: 'api.request.complete',
        surface: 'web.transactions',
      })
    ).toThrow(TelemetryCatalogError);
  });

  it('prepareTelemetryRecord enforces catalog membership', () => {
    expect(() =>
      prepareTelemetryRecord({
        operation: 'invented.operation',
        surface: 'web.dashboard',
      } as unknown as Parameters<typeof prepareTelemetryRecord>[0])
    ).toThrow(TelemetryCatalogError);
  });
});

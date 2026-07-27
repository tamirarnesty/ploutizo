import { describe, expect, it } from 'vitest';
import type { TelemetryAttributes } from '../attributes';

describe('telemetry attribute schemas', () => {
  it('types browser API operations with safe diagnostic fields only', () => {
    const attrs: TelemetryAttributes<'browser.api_request'> = {
      status: 200,
      method: 'GET',
      route: '/api/transactions',
    };

    expect(attrs.status).toBe(200);
  });

  it('types api request completion with HTTP outcome fields', () => {
    const attrs: TelemetryAttributes<'api.request.complete'> = {
      status: 500,
      method: 'POST',
      route: '/api/transactions/:id',
      classification: 'unexpected',
      code: 'INTERNAL_ERROR',
      kind: 'http',
    };

    expect(attrs.classification).toBe('unexpected');
  });

  it('types route preload with route template metadata', () => {
    const attrs: TelemetryAttributes<'route.preload'> = {
      route: '/dashboard',
    };

    expect(attrs.route).toBe('/dashboard');
  });

  it('rejects attributes outside the operation schema at compile time', () => {
    const attrs: TelemetryAttributes<'browser.api_request'> = {
      status: 200,
      // @ts-expect-error entity identifiers are not part of list telemetry
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    };

    expect(attrs.status).toBe(200);
  });
});

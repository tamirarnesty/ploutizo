import { describe, expect, it } from 'vitest';
import { prepareTelemetryRecord, trimMessage } from '../contract';

describe('prepareTelemetryRecord', () => {
  it('accepts operation-scoped typed attributes', () => {
    const record = prepareTelemetryRecord({
      operation: 'transactions.list',
      surface: 'web.transactions',
      attributes: {
        status: 200,
        count: 12,
      },
    });

    expect(record.attributes).toEqual({ status: 200, count: 12 });
  });

  it('truncates long diagnostic messages', () => {
    const record = prepareTelemetryRecord({
      operation: 'transactions.list',
      surface: 'web.transactions',
      message: 'x'.repeat(250),
    });

    expect(record.message?.length).toBe(200);
  });

  it('preserves short diagnostic messages', () => {
    const record = prepareTelemetryRecord({
      operation: 'route.preload',
      surface: 'web.dashboard',
      message: 'Loader retry scheduled',
      attributes: {
        route: '/dashboard',
      },
    });

    expect(record.message).toBe('Loader retry scheduled');
    expect(record.attributes.route).toBe('/dashboard');
  });

  it('accepts trimmed correlation IDs and drops invalid values', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const record = prepareTelemetryRecord({
      operation: 'browser.api_request',
      surface: 'web.transactions',
      operationId: `  ${id}  `,
      requestId: ` ${id} `,
    });

    expect(record.operationId).toBe(id);
    expect(record.requestId).toBe(id);

    const invalid = prepareTelemetryRecord({
      operation: 'browser.api_request',
      surface: 'web.transactions',
      operationId: 'not-a-uuid',
    });

    expect(invalid.operationId).toBeUndefined();
  });
});

describe('trimMessage', () => {
  it('trims and truncates diagnostic messages', () => {
    expect(trimMessage('  hello  ')).toBe('hello');
    expect(trimMessage('x'.repeat(250))?.length).toBe(200);
    expect(trimMessage('   ')).toBeUndefined();
  });
});

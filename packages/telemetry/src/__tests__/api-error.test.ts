import { describe, expect, it } from 'vitest';
import {
  TelemetryApiError,
  classifyApiError,
  isTelemetryApiError,
  toSafeApiErrorAttributes,
} from '../api-error';

describe('TelemetryApiError', () => {
  it('preserves safe diagnostic fields and user-facing message', () => {
    const cause = new Error('socket hang up');
    const error = new TelemetryApiError({
      message: 'Could not save transaction.',
      status: 500,
      code: 'INTERNAL_ERROR',
      route: '/api/transactions/:id',
      method: 'patch',
      durationMs: 42,
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      operationId: '550e8400-e29b-41d4-a716-446655440001',
      kind: 'http',
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Could not save transaction.');
    expect(error.status).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.route).toBe('/api/transactions/:id');
    expect(error.method).toBe('PATCH');
    expect(error.durationMs).toBe(42);
    expect(error.cause).toBe(cause);
    expect(isTelemetryApiError(error)).toBe(true);
  });

  it('classifies expected product outcomes', () => {
    expect(
      classifyApiError({ status: 400, code: 'VALIDATION_ERROR' })
    ).toBe('expected');
    expect(classifyApiError({ status: 404, code: 'NOT_FOUND' })).toBe(
      'expected'
    );
    expect(classifyApiError({ status: 403, code: 'FORBIDDEN' })).toBe(
      'expected'
    );
    expect(classifyApiError({ status: 409, code: 'CONFLICT' })).toBe(
      'expected'
    );
    expect(classifyApiError({ status: 400, code: 'DOMAIN_ERROR' })).toBe(
      'expected'
    );
  });

  it('classifies unexpected failures for Error Tracking', () => {
    expect(classifyApiError({ kind: 'network' })).toBe('unexpected');
    expect(classifyApiError({ kind: 'malformed' })).toBe('unexpected');
    expect(classifyApiError({ status: 500, code: 'INTERNAL_ERROR' })).toBe(
      'unexpected'
    );
    expect(classifyApiError({ status: 400, code: 'WEIRD_CODE' })).toBe(
      'unexpected'
    );
    expect(classifyApiError({ status: 418 })).toBe('unexpected');
  });

  it('exports safe attributes without message or cause', () => {
    const error = new TelemetryApiError({
      message: 'Private user text must not leak into attributes.',
      status: 404,
      code: 'NOT_FOUND',
      route: '/api/accounts/:id',
      method: 'GET',
      durationMs: 12,
      kind: 'http',
      cause: { body: { password: 'x' } },
    });

    const attributes = toSafeApiErrorAttributes(error);
    expect(attributes).toEqual({
      kind: 'http',
      classification: 'expected',
      status: 404,
      code: 'NOT_FOUND',
      route: '/api/accounts/:id',
      method: 'GET',
      durationMs: 12,
    });
    expect(JSON.stringify(attributes)).not.toContain('Private user text');
    expect(JSON.stringify(attributes)).not.toContain('password');
  });
});

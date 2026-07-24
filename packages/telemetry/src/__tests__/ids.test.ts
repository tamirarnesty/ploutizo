import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_CORRELATION_HEADERS,
  createOperationId,
  createRequestId,
  isValidCorrelationId,
  parseCorrelationId,
  resolveCorrelationId,
} from '../ids';

describe('correlation IDs', () => {
  it('creates UUIDv4 operation and request IDs', () => {
    const operationId = createOperationId();
    const requestId = createRequestId();

    expect(isValidCorrelationId(operationId)).toBe(true);
    expect(isValidCorrelationId(requestId)).toBe(true);
    expect(operationId).not.toBe(requestId);
  });

  it('validates and parses correlation IDs', () => {
    const valid = '550e8400-e29b-41d4-a716-446655440000';
    expect(isValidCorrelationId(valid)).toBe(true);
    expect(parseCorrelationId(` ${valid} `)).toBe(valid);

    expect(isValidCorrelationId('not-a-uuid')).toBe(false);
    expect(isValidCorrelationId('550e8400-e29b-11d4-a716-446655440000')).toBe(
      false
    ); // not version 4
    expect(parseCorrelationId(null)).toBeNull();
    expect(parseCorrelationId(123)).toBeNull();
    expect(parseCorrelationId('')).toBeNull();
  });

  it('resolveCorrelationId accepts valid IDs and replaces invalid ones', () => {
    const valid = createRequestId();
    expect(resolveCorrelationId(valid)).toBe(valid);

    const generated = resolveCorrelationId('bad-id', () => valid);
    expect(generated).toBe(valid);
  });

  it('exposes telemetry-only correlation header names', () => {
    expect(TELEMETRY_CORRELATION_HEADERS.requestId).toBe('X-Request-Id');
    expect(TELEMETRY_CORRELATION_HEADERS.operationId).toBe('X-Operation-Id');
  });
});
